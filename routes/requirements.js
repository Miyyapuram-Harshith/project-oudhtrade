import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pgDb from '../data/postgres.js';
import { authenticateUser } from './auth.js';

const router = express.Router();

// Fetch all active requirements
router.get('/', authenticateUser, (req, res) => {
  const { category, region, keyword } = req.query;

  let filtered = pgDb.requirements.filter(r => r.status === 'active');

  if (category) {
    filtered = filtered.filter(r => r.category?.toLowerCase() === category.toLowerCase());
  }

  if (region) {
    filtered = filtered.filter(r => r.region?.toLowerCase().includes(region.toLowerCase()) || 
                                    r.description?.toLowerCase().includes(region.toLowerCase()));
  }

  if (keyword) {
    const k = keyword.toLowerCase();
    filtered = filtered.filter(r => r.title.toLowerCase().includes(k) || r.description.toLowerCase().includes(k));
  }

  // Enrich with owner details
  const enriched = filtered.map(r => {
    let ownerName = 'Unknown User';
    if (r.owner_type === 'company') {
      const ownerMapping = pgDb.company_team.find(t => t.company_id === r.owner_id && t.team_role === 'owner');
      if (ownerMapping) {
        const u = pgDb.users.find(usr => usr.id === ownerMapping.user_id);
        ownerName = u?.profile?.legal_company_name || 'Assigned Company';
      }
    } else {
      const u = pgDb.users.find(usr => usr.id === r.owner_id);
      ownerName = u?.profile?.business_name || u?.profile?.plantation_name || u?.profile?.provider_business_name || u?.profile?.nursery_business_name || u?.profile?.display_name || 'Independent Buyer';
    }

    return {
      ...r,
      owner_name: ownerName
    };
  });

  res.status(200).json(enriched);
});

// Fetch my own requirements
router.get('/my-requirements', authenticateUser, (req, res) => {
  const ownerId = req.user.company_id || req.user.id;
  const ownerType = req.user.company_id ? 'company' : 'user';

  const myReqs = pgDb.requirements.filter(r => r.owner_id === ownerId && r.owner_type === ownerType);
  res.status(200).json(myReqs);
});

// Create a new requirement
router.post('/', authenticateUser, (req, res) => {
  const { title, description, category, region } = req.body;

  if (!title || !description || !category || !region) {
    return res.status(400).json({ error: 'Title, description, category, and region are required.' });
  }

  // Check email verification gate
  if (req.user.account_state === 'pending_email') {
    return res.status(403).json({ error: 'Email gate constraint: Complete email verification first.' });
  }

  const ownerId = req.user.company_id || req.user.id;
  const ownerType = req.user.company_id ? 'company' : 'user';

  const newReq = {
    id: uuidv4(),
    owner_id: ownerId,
    owner_type: ownerType,
    title,
    description,
    category,
    region,
    status: 'active',
    created_at: new Date().toISOString()
  };

  pgDb.requirements.push(newReq);

  pgDb.audit_logs.push({
    id: uuidv4(),
    action: 'REQUIREMENT_CREATED',
    user_id: req.user.id,
    details: { requirementId: newReq.id },
    ip_address: req.ip,
    created_at: new Date().toISOString()
  });

  pgDb.save();

  res.status(201).json({
    message: 'Requirement posted successfully.',
    requirement: newReq
  });
});

// Close a requirement
router.patch('/:id/close', authenticateUser, (req, res) => {
  const reqId = req.params.id;
  const requirement = pgDb.requirements.find(r => r.id === reqId);

  if (!requirement) {
    return res.status(404).json({ error: 'Requirement not found.' });
  }

  const ownerId = req.user.company_id || req.user.id;
  if (requirement.owner_id !== ownerId) {
    return res.status(403).json({ error: 'Forbidden: You do not own this requirement.' });
  }

  requirement.status = 'closed';
  pgDb.save();

  res.status(200).json({
    message: 'Requirement closed successfully.',
    requirement
  });
});

export default router;
