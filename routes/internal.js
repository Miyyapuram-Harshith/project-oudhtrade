import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pgDb from '../data/postgres.js';
import mongoDb from '../data/mongodb.js';
import { authenticateUser, authorizeRoles } from './auth.js';

const router = express.Router();

// 1. TRUST & SAFETY / MODERATION PANEL
// Fetch all users requiring verification review (Moderator/Admin/CEO only)
router.get('/moderation/users', authenticateUser, authorizeRoles('ceo', 'ops_lead', 'moderator'), (req, res) => {
  // Find users whose id_proof_status is 'pending' or extra_proof_status is 'pending'
  const pendingUsers = pgDb.users.filter(u => u.id_proof_status === 'pending' || u.extra_proof_status === 'pending');
  
  // Enrich with verification docs from MongoDB
  const enriched = pendingUsers.map(u => {
    const docs = mongoDb.verification_documents.filter(d => d.user_id === u.id);
    return {
      ...u,
      verification_documents: docs
    };
  });

  res.status(200).json(enriched);
});

// Update verification status (Approve/Reject doc and toggle badges)
router.post('/moderation/users/:id/verify', authenticateUser, authorizeRoles('ceo', 'ops_lead', 'moderator'), (req, res) => {
  const userId = req.params.id;
  const { docType, status, rejectionReason } = req.body; // status: 'approved', 'rejected'

  const user = pgDb.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Update MongoDB documents status
  const userDocs = mongoDb.verification_documents.filter(d => d.user_id === userId && d.doc_type === docType);
  userDocs.forEach(d => {
    d.status = status;
    if (rejectionReason) d.rejection_reason = rejectionReason;
  });
  mongoDb.save();

  if (status === 'approved') {
    if (docType === 'gov_id' || docType === 'business_reg') {
      user.id_proof_status = 'approved';
      user.account_state = 'active_verified';
      
      // Auto assign default trust badges
      if (user.role === 'buyer' && !user.trust_badges.includes('Verified Buyer')) {
        user.trust_badges.push('Verified Buyer');
      } else if (user.role === 'seller' && !user.trust_badges.includes('Verified Seller')) {
        user.trust_badges.push('Verified Seller');
      } else if (user.role === 'company' && !user.trust_badges.includes('Verified Company')) {
        user.trust_badges.push('Verified Company');
      }
    } else if (docType === 'extra_proof') {
      user.extra_proof_status = 'approved';
      
      // Unlock premium specific badges
      if (user.role === 'farmer' && !user.trust_badges.includes('Verified Plantation')) {
        user.trust_badges.push('Verified Plantation');
      } else if (user.role === 'inoculation_provider' && !user.trust_badges.includes('Verified Specialist')) {
        user.trust_badges.push('Verified Specialist');
      } else if (user.role === 'nursery' && !user.trust_badges.includes('Verified Nursery')) {
        user.trust_badges.push('Verified Nursery');
      }
    }
  } else if (status === 'rejected') {
    if (docType === 'gov_id' || docType === 'business_reg') {
      user.id_proof_status = 'rejected';
    } else if (docType === 'extra_proof') {
      user.extra_proof_status = 'rejected';
    }
  }

  pgDb.audit_logs.push({
    id: uuidv4(),
    action: `USER_VERIFICATION_${status.toUpperCase()}`,
    user_id: req.user.id,
    details: { targetUserId: userId, docType, reason: rejectionReason || null },
    ip_address: req.ip,
    created_at: new Date().toISOString()
  });

  pgDb.save();

  res.status(200).json({
    message: `Verification document status updated to ${status}.`,
    user
  });
});

// Suspend or Deactivate user accounts
router.post('/moderation/users/:id/status', authenticateUser, authorizeRoles('ceo', 'ops_lead', 'moderator'), (req, res) => {
  const userId = req.params.id;
  const { accountState } = req.body; // 'active_verified', 'suspended', 'deactivated'

  const user = pgDb.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  user.account_state = accountState;

  pgDb.audit_logs.push({
    id: uuidv4(),
    action: `USER_STATE_OVERRIDE_${accountState.toUpperCase()}`,
    user_id: req.user.id,
    details: { targetUserId: userId },
    ip_address: req.ip,
    created_at: new Date().toISOString()
  });

  pgDb.save();

  res.status(200).json({ message: `User account state set to ${accountState}.`, user });
});

// List all listings for moderation review (includes pending_verification)
router.get('/moderation/listings', authenticateUser, authorizeRoles('ceo', 'ops_lead', 'moderator'), (req, res) => {
  res.status(200).json(pgDb.listings);
});

// Approve/Reject listings
router.post('/moderation/listings/:id/review', authenticateUser, authorizeRoles('ceo', 'ops_lead', 'moderator'), (req, res) => {
  const listingId = req.params.id;
  const { approve } = req.body; // boolean

  const listing = pgDb.listings.find(l => l.id === listingId);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found.' });
  }

  if (approve) {
    listing.status = 'published';
  } else {
    listing.status = 'paused'; // rejected/takedown state
  }

  pgDb.audit_logs.push({
    id: uuidv4(),
    action: `LISTING_MODERATION_${approve ? 'APPROVED' : 'REJECTED'}`,
    user_id: req.user.id,
    details: { listingId },
    ip_address: req.ip,
    created_at: new Date().toISOString()
  });

  pgDb.save();

  res.status(200).json({ message: `Listing review finalized. Status: ${listing.status}`, listing });
});

// 2. COMPLIANCE PANEL (Grievances under IT Rules 2021 & DPO under DPDP Act 2023)
// Get all grievances
router.get('/compliance/grievances', authenticateUser, authorizeRoles('ceo', 'ops_lead'), (req, res) => {
  const enriched = pgDb.grievances.map(g => {
    const reporter = pgDb.users.find(u => u.id === g.reporter_id);
    const suspect = pgDb.users.find(u => u.id === g.reported_user_id);
    const listing = pgDb.listings.find(l => l.id === g.reported_listing_id);

    return {
      ...g,
      reporter_email: reporter ? reporter.email : 'Unknown',
      reported_user_email: suspect ? suspect.email : 'None',
      reported_listing_title: listing ? listing.title : 'None'
    };
  });
  res.status(200).json(enriched);
});

// Update grievance status (Acknowledge within 24h, Resolve within 15d)
router.post('/compliance/grievances/:id/status', authenticateUser, authorizeRoles('ceo', 'ops_lead'), (req, res) => {
  const grievanceId = req.params.id;
  const { action, resolutionNotes } = req.body; // action: 'acknowledge' or 'resolve'

  const grievance = pgDb.grievances.find(g => g.id === grievanceId);
  if (!grievance) {
    return res.status(404).json({ error: 'Grievance ticket not found.' });
  }

  if (action === 'acknowledge') {
    grievance.status = 'acknowledged';
    grievance.acknowledged_at = new Date().toISOString();
  } else if (action === 'resolve') {
    if (!resolutionNotes) {
      return res.status(400).json({ error: 'Resolution notes are required to resolve grievances.' });
    }
    grievance.status = 'resolved';
    grievance.resolved_at = new Date().toISOString();
    grievance.resolution_notes = resolutionNotes;
  }

  pgDb.save();

  res.status(200).json({ message: `Grievance ticket status updated to ${grievance.status}.`, grievance });
});

// DPDP / DPO Users List - fetch all registered users for DPO panel management
router.get('/compliance/dpo/users', authenticateUser, authorizeRoles('ceo', 'ops_lead'), (req, res) => {
  const users = pgDb.users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.role,
    id_proof_status: u.id_proof_status,
    email_verified: u.email_verified,
    created_at: u.created_at,
    profile: u.profile || {}
  }));
  res.status(200).json(users);
});

// DPDP / DPO User Data Export request (Access right)
router.get('/compliance/dpo/export/:userId', authenticateUser, authorizeRoles('ceo', 'ops_lead'), (req, res) => {
  const targetId = req.params.userId;
  const user = pgDb.users.find(u => u.id === targetId);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  // Compile all data fields related to user for compliance export
  const userListings = pgDb.listings.filter(l => l.owner_id === targetId);
  const userReqs = pgDb.requirements.filter(r => r.owner_id === targetId);
  const userGrievances = pgDb.grievances.filter(g => g.reporter_id === targetId || g.reported_user_id === targetId);
  const userAuditLogs = pgDb.audit_logs.filter(a => a.user_id === targetId);

  const exportPackage = {
    user_metadata: user,
    listings: userListings,
    requirements: userReqs,
    reported_grievances: userGrievances,
    audit_trail: userAuditLogs,
    exported_at: new Date().toISOString(),
    dpo_signature: "OudhTrade Data Protection Office (Statutory compliance under DPDP Act 2023)"
  };

  pgDb.data_rights_requests.push({
    id: uuidv4(),
    user_id: targetId,
    request_type: 'data_access',
    status: 'completed',
    processed_by: req.user.id,
    created_at: new Date().toISOString()
  });
  pgDb.save();

  res.status(200).json(exportPackage);
});

// DPDP / DPO User Account Deletion request (Erasure right)
router.delete('/compliance/dpo/delete/:userId', authenticateUser, authorizeRoles('ceo', 'ops_lead'), (req, res) => {
  const targetId = req.params.userId;
  const userIdx = pgDb.users.findIndex(u => u.id === targetId);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const user = pgDb.users[userIdx];

  // Delete listings and requirements
  pgDb.listings = pgDb.listings.filter(l => l.owner_id !== targetId);
  pgDb.requirements = pgDb.requirements.filter(r => r.owner_id !== targetId);

  // Soft delete / remove user credentials to satisfy erasure
  pgDb.users.splice(userIdx, 1);

  pgDb.data_rights_requests.push({
    id: uuidv4(),
    user_id: targetId,
    request_type: 'data_erasure',
    status: 'completed',
    processed_by: req.user.id,
    created_at: new Date().toISOString()
  });

  pgDb.save();

  res.status(200).json({ message: 'User records permanently erased under statutory DPDP Act guidelines.' });
});

// 3. ANALYTICS & STATS
router.get('/analytics/overview', authenticateUser, authorizeRoles('ceo', 'ops_lead', 'moderator'), (req, res) => {
  const totalUsers = pgDb.users.length;
  const activeListings = pgDb.listings.filter(l => l.status === 'published').length;
  const pendingVerifications = pgDb.users.filter(u => u.id_proof_status === 'pending' || u.extra_proof_status === 'pending').length;
  const openGrievances = pgDb.grievances.filter(g => g.status !== 'resolved').length;

  // Breakdown listings by type
  const listingsByType = {
    product: pgDb.listings.filter(l => l.listing_type === 'product').length,
    service: pgDb.listings.filter(l => l.listing_type === 'service').length,
    plant: pgDb.listings.filter(l => l.listing_type === 'plant').length,
    by_product: pgDb.listings.filter(l => l.listing_type === 'by_product').length,
  };

  res.status(200).json({
    totalUsers,
    activeListings,
    pendingVerifications,
    openGrievances,
    listingsByType,
    auditLogs: pgDb.audit_logs.slice(-20) // last 20 records
  });
});

export default router;
