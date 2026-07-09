import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pgDb from '../data/postgres.js';
import { authenticateUser } from './auth.js';

const router = express.Router();

// Helper: check rate limits
function checkRateLimit(user) {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Count threads started by this user in last 24 hours
  const outboundCount = pgDb.threads.filter(t => 
    t.initiator_id === user.id && 
    new Date(t.created_at).getTime() > oneDayAgo
  ).length;

  let limit = 5; // default unverified
  if (user.trust_badges?.includes('Verified Buyer') || 
      user.trust_badges?.includes('Verified Seller') || 
      user.trust_badges?.includes('Verified Plantation') ||
      user.trust_badges?.includes('Verified Specialist') ||
      user.trust_badges?.includes('Verified Nursery')) {
    limit = 50; // fully verified
  } else if (user.phone_verified) {
    limit = 20; // phone verified
  }

  return outboundCount < limit;
}

// Fetch all conversation threads for current user (or company)
router.get('/threads', authenticateUser, (req, res) => {
  const myId = req.user.company_id || req.user.id;

  const threads = pgDb.threads.filter(t => t.initiator_id === myId || t.receiver_id === myId);

  // Enrich with participant details and message logs
  const enriched = threads.map(t => {
    const messages = pgDb.messages.filter(m => m.thread_id === t.id);
    const otherPartyId = t.initiator_id === myId ? t.receiver_id : t.initiator_id;

    // Find other party details
    let otherName = 'OudhTrade Member';
    let otherRole = 'user';
    let otherState = 'active_verified';
    
    // Check if other party is company or user
    const otherUser = pgDb.users.find(u => u.id === otherPartyId || u.company_id === otherPartyId);
    if (otherUser) {
      otherRole = otherUser.role;
      otherState = otherUser.account_state;
      if (otherUser.company_id === otherPartyId) {
        // Retrieve owner's legal company name
        const ownerMapping = pgDb.company_team.find(tm => tm.company_id === otherPartyId && tm.team_role === 'owner');
        const ownerUser = pgDb.users.find(usr => usr.id === ownerMapping?.user_id);
        otherName = ownerUser?.profile?.legal_company_name || 'Assigned Company';
      } else {
        otherName = otherUser.profile.display_name || otherUser.profile.business_name || otherUser.profile.plantation_name || otherUser.profile.provider_business_name || otherUser.profile.nursery_business_name || otherUser.email;
      }
    }

    // Context object enrichment
    let listing = null;
    if (t.listing_id) {
      listing = pgDb.listings.find(l => l.id === t.listing_id);
    }
    let requirement = null;
    if (t.requirement_id) {
      requirement = pgDb.requirements.find(r => r.id === t.requirement_id);
    }

    return {
      ...t,
      messages,
      other_party_name: otherName,
      other_party_role: otherRole,
      other_party_state: otherState,
      listing_context: listing,
      requirement_context: requirement
    };
  });

  res.status(200).json(enriched);
});

// Start a thread
router.post('/threads', authenticateUser, (req, res) => {
  const { receiver_id, listing_id, requirement_id, tag, initial_message } = req.body;

  if (!receiver_id || !initial_message) {
    return res.status(400).json({ error: 'Receiver ID and initial message content are required.' });
  }

  // 1. Email Gate
  if (req.user.account_state === 'pending_email') {
    return res.status(403).json({ error: 'Email gate constraint: Complete email verification before messaging.' });
  }

  const senderId = req.user.company_id || req.user.id;

  // 2. Check blocks (silently enforce)
  const receiverUser = pgDb.users.find(u => u.id === receiver_id || u.company_id === receiver_id);
  const isSenderBlocked = receiverUser?.blocked_users?.includes(senderId);
  const isReceiverBlocked = req.user.blocked_users?.includes(receiver_id);

  if (isSenderBlocked || isReceiverBlocked) {
    // Silent prevention: return 201 success but do not record thread or send message
    return res.status(201).json({
      message: 'Thread initiated successfully (Silently Blocked).',
      thread: { id: 'blocked-thread-' + uuidv4(), messages: [] }
    });
  }

  // 3. Rate Limit Gate
  if (!checkRateLimit(req.user)) {
    return res.status(429).json({ error: 'Rate limit exceeded: You have reached your outbound thread limit for today.' });
  }

  // Check if thread already exists for this context
  let thread = pgDb.threads.find(t => 
    ((t.initiator_id === senderId && t.receiver_id === receiver_id) || 
     (t.initiator_id === receiver_id && t.receiver_id === senderId)) &&
    t.listing_id === listing_id &&
    t.requirement_id === requirement_id
  );

  if (!thread) {
    thread = {
      id: uuidv4(),
      initiator_id: senderId,
      receiver_id: receiver_id,
      listing_id: listing_id || null,
      requirement_id: requirement_id || null,
      tag: tag || 'general',
      assigned_to: null, // assigned team member for company
      created_at: new Date().toISOString()
    };
    pgDb.threads.push(thread);
  }

  // Add the message
  const msg = {
    id: uuidv4(),
    thread_id: thread.id,
    sender_id: req.user.id, // actual user replying
    content: initial_message,
    audit_sender_role: req.user.company_id 
      ? (pgDb.company_team.find(t => t.company_id === req.user.company_id && t.user_id === req.user.id)?.team_role || 'member')
      : null,
    created_at: new Date().toISOString()
  };
  pgDb.messages.push(msg);

  pgDb.save();

  res.status(201).json({
    message: 'Conversation started.',
    thread
  });
});

// Reply inside an existing thread
router.post('/threads/:id/messages', authenticateUser, (req, res) => {
  const threadId = req.params.id;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Message content cannot be blank.' });
  }

  const thread = pgDb.threads.find(t => t.id === threadId);
  if (!thread) {
    return res.status(404).json({ error: 'Conversation thread not found.' });
  }

  const myId = req.user.company_id || req.user.id;
  if (thread.initiator_id !== myId && thread.receiver_id !== myId) {
    return res.status(403).json({ error: 'Forbidden: You do not belong to this thread.' });
  }

  const receiverId = thread.initiator_id === myId ? thread.receiver_id : thread.initiator_id;

  // 1. Silent block enforcement
  const receiverUser = pgDb.users.find(u => u.id === receiverId || u.company_id === receiverId);
  const isSenderBlocked = receiverUser?.blocked_users?.includes(myId);
  const isReceiverBlocked = req.user.blocked_users?.includes(receiverId);

  if (isSenderBlocked || isReceiverBlocked) {
    // Silent success response but do not save or send
    return res.status(200).json({ message: 'Message sent (Blocked).' });
  }

  // 2. Check if receiver is deactivated
  if (receiverUser && (receiverUser.account_state === 'deactivated' || receiverUser.account_state === 'suspended')) {
    return res.status(400).json({ error: 'Recipient is currently unavailable.' });
  }

  const msg = {
    id: uuidv4(),
    thread_id: thread.id,
    sender_id: req.user.id,
    content,
    audit_sender_role: req.user.company_id 
      ? (pgDb.company_team.find(t => t.company_id === req.user.company_id && t.user_id === req.user.id)?.team_role || 'member')
      : null,
    created_at: new Date().toISOString()
  };

  pgDb.messages.push(msg);
  pgDb.save();

  res.status(200).json({
    message: 'Message delivered successfully.',
    message_item: msg
  });
});

// Block/Unblock a user
router.post('/block', authenticateUser, (req, res) => {
  const { userId, action } = req.body; // action: 'block' or 'unblock'

  if (!userId || !action) {
    return res.status(400).json({ error: 'userId and action are required.' });
  }

  if (!req.user.blocked_users) {
    req.user.blocked_users = [];
  }

  if (action === 'block') {
    if (!req.user.blocked_users.includes(userId)) {
      req.user.blocked_users.push(userId);
    }
  } else if (action === 'unblock') {
    req.user.blocked_users = req.user.blocked_users.filter(id => id !== userId);
  }

  pgDb.save();

  res.status(200).json({
    message: `User ${action === 'block' ? 'blocked' : 'unblocked'} successfully.`,
    blocked_users: req.user.blocked_users
  });
});

// Report a user (Create Grievance complaint)
router.post('/report', authenticateUser, (req, res) => {
  const { reportedUserId, listingId, complaintText } = req.body;

  if (!complaintText) {
    return res.status(400).json({ error: 'Complaint explanation text is required.' });
  }

  const newGrievance = {
    id: uuidv4(),
    reporter_id: req.user.id,
    reported_user_id: reportedUserId || null,
    reported_listing_id: listingId || null,
    complaint_text: complaintText,
    status: 'pending', // pending, acknowledged, resolved
    created_at: new Date().toISOString()
  };

  pgDb.grievances.push(newGrievance);
  pgDb.save();

  res.status(200).json({
    message: 'Complaint reported to the Grievance Officer. Investigation will be processed.',
    grievance: newGrievance
  });
});

// Assign thread inside Company shared inbox
router.post('/threads/:id/assign', authenticateUser, (req, res) => {
  const threadId = req.params.id;
  const { assignToUserId } = req.body;

  if (!req.user.company_id) {
    return res.status(403).json({ error: 'Forbidden: Assign thread is only available for Company members.' });
  }

  const thread = pgDb.threads.find(t => t.id === threadId);
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found.' });
  }

  // Ensure user resides in company
  const isMember = pgDb.company_team.some(t => t.company_id === req.user.company_id && t.user_id === assignToUserId);
  if (assignToUserId && !isMember) {
    return res.status(400).json({ error: 'Invalid assignment: Assignee is not part of your company team.' });
  }

  thread.assigned_to = assignToUserId || null;
  pgDb.save();

  res.status(200).json({
    message: 'Thread assignment updated.',
    thread
  });
});

export default router;
