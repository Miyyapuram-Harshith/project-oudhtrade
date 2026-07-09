import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pgDb from '../data/postgres.js';
import mongoDb from '../data/mongodb.js';
import { authenticateUser } from './auth.js';

const router = express.Router();

// Helper: check if company team member has permission
function checkCompanyPermission(userId, companyId, requiredRoles) {
  const teamMapping = pgDb.company_team.find(t => t.company_id === companyId && t.user_id === userId);
  if (!teamMapping) return false;
  return requiredRoles.includes(teamMapping.team_role);
}

// Fetch all published listings with search parameters
router.get('/', authenticateUser, (req, res) => {
  const { category, region, keyword, species, listingType } = req.query;

  let filtered = pgDb.listings.filter(l => l.status === 'published');

  if (category) {
    filtered = filtered.filter(l => l.attributes?.category?.toLowerCase() === category.toLowerCase());
  }

  if (region) {
    filtered = filtered.filter(l => l.attributes?.region?.toLowerCase().includes(region.toLowerCase()) || 
                                    l.description?.toLowerCase().includes(region.toLowerCase()));
  }

  if (listingType) {
    filtered = filtered.filter(l => l.listing_type === listingType);
  }

  if (species) {
    filtered = filtered.filter(l => l.attributes?.species?.toLowerCase().includes(species.toLowerCase()) ||
                                    l.description?.toLowerCase().includes(species.toLowerCase()));
  }

  if (keyword) {
    const k = keyword.toLowerCase();
    filtered = filtered.filter(l => l.title.toLowerCase().includes(k) || l.description.toLowerCase().includes(k));
  }

  // Enrich with owner business details
  const enriched = filtered.map(l => {
    let ownerName = 'Unknown User';
    let trustBadges = [];
    if (l.owner_type === 'company') {
      // Find owner user profile
      const ownerMapping = pgDb.company_team.find(t => t.company_id === l.owner_id && t.team_role === 'owner');
      if (ownerMapping) {
        const u = pgDb.users.find(usr => usr.id === ownerMapping.user_id);
        ownerName = u?.profile?.legal_company_name || 'Assigned Company';
        trustBadges = u?.trust_badges || [];
      }
    } else {
      const u = pgDb.users.find(usr => usr.id === l.owner_id);
      ownerName = u?.profile?.business_name || u?.profile?.plantation_name || u?.profile?.provider_business_name || u?.profile?.nursery_business_name || u?.profile?.display_name || 'Independent Partner';
      trustBadges = u?.trust_badges || [];
    }

    return {
      ...l,
      owner_name: ownerName,
      trust_badges: trustBadges
    };
  });

  res.status(200).json(enriched);
});

// Fetch my own listings (Dashboard)
router.get('/my-listings', authenticateUser, (req, res) => {
  const ownerId = req.user.company_id || req.user.id;
  const ownerType = req.user.company_id ? 'company' : 'user';

  const myListings = pgDb.listings.filter(l => l.owner_id === ownerId && l.owner_type === ownerType);
  res.status(200).json(myListings);
});

// Create a new listing
router.post('/', authenticateUser, async (req, res) => {
  const { title, description, listing_type, attributes, media, publishNow } = req.body;

  if (!title || !description || !listing_type) {
    return res.status(400).json({ error: 'Title, description, and listing type are required.' });
  }

  const role = req.user.role;

  // 1. Role creation checks
  if (role === 'buyer') {
    return res.status(403).json({ error: 'Rule restriction: Buyers cannot create supply listings.' });
  }

  if (role === 'seller' && listing_type !== 'product') {
    return res.status(403).json({ error: 'Rule restriction: General Sellers can only create Product listings.' });
  }

  if (role === 'company') {
    // If company, verify permission
    if (!checkCompanyPermission(req.user.id, req.user.company_id, ['owner', 'manager', 'listing_editor'])) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to add company listings.' });
    }
    if (listing_type !== 'product') {
      return res.status(403).json({ error: 'Rule restriction: Companies can only create Product listings.' });
    }
  }

  if (role === 'farmer' && !['plant', 'by_product'].includes(listing_type)) {
    return res.status(403).json({ error: 'Rule restriction: Farmers can only create Plant and By-product listings.' });
  }

  if (role === 'inoculation_provider' && !['service', 'by_product'].includes(listing_type)) {
    return res.status(403).json({ error: 'Rule restriction: Inoculation Providers can only create Service and By-product listings.' });
  }

  if (role === 'nursery' && !['plant', 'by_product'].includes(listing_type)) {
    return res.status(403).json({ error: 'Rule restriction: Nurseries can only create Plant and By-product listings.' });
  }

  // 2. Verification check to see if allowed to publish
  const isOwnerVerified = req.user.phone_verified && req.user.id_proof_status === 'approved';
  
  let targetStatus = 'draft';
  if (publishNow) {
    targetStatus = isOwnerVerified ? 'published' : 'pending_verification';
  }

  // 3. Trigger Python AI Compliance Audit
  let compliancePassed = true;
  let complianceSummary = 'Passed basic scans.';
  let detectedFlags = [];

  try {
    const aiRes = await fetch('http://localhost:8000/api/v1/ai/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, listing_type })
    });

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      compliancePassed = aiData.is_compliant;
      complianceSummary = aiData.summary;
      detectedFlags = aiData.flags;

      // Save evaluation report to Mongo Simulator
      mongoDb.cites_evaluations.push({
        id: uuidv4(),
        listing_title: title,
        is_compliant: compliancePassed,
        summary: complianceSummary,
        flags: detectedFlags,
        recommendations: aiData.recommendations,
        cites_category: aiData.cites_category,
        checked_at: new Date().toISOString()
      });
      mongoDb.save();
    }
  } catch (error) {
    console.error('[NODE CORE] Error reaching Compliance AI engine:', error.message);
    // Continue with soft warnings if AI engine is down
  }

  // If compliance check failed, force status to pending_verification
  if (!compliancePassed) {
    targetStatus = 'pending_verification';
  }

  const ownerId = req.user.company_id || req.user.id;
  const ownerType = req.user.company_id ? 'company' : 'user';

  const newListing = {
    id: uuidv4(),
    owner_id: ownerId,
    owner_type: ownerType,
    listing_type,
    title,
    description,
    status: targetStatus,
    attributes: attributes || {},
    media: media || [],
    views_count: 0,
    saves_count: 0,
    inquiries_count: 0,
    compliance_passed: compliancePassed,
    compliance_flags: detectedFlags,
    compliance_summary: complianceSummary,
    created_at: new Date().toISOString()
  };

  pgDb.listings.push(newListing);

  pgDb.audit_logs.push({
    id: uuidv4(),
    action: 'LISTING_CREATED',
    user_id: req.user.id,
    details: { listingId: newListing.id, status: targetStatus, compliancePassed },
    ip_address: req.ip,
    created_at: new Date().toISOString()
  });

  pgDb.save();

  res.status(201).json({
    message: !compliancePassed 
      ? 'Warning: Listing contains potential CITES trade red flags and is held for Moderator Review.'
      : !isOwnerVerified && publishNow
      ? 'Listing saved in pending verification. Complete your phone and document verifications to go live.'
      : 'Listing saved successfully.',
    listing: newListing
  });
});

// Update/Edit listing
router.put('/:id', authenticateUser, async (req, res) => {
  const listingId = req.params.id;
  const { title, description, attributes, media, publishNow, status } = req.body;

  const listing = pgDb.listings.find(l => l.id === listingId);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found.' });
  }

  // Check ownership
  const ownerId = req.user.company_id || req.user.id;
  if (listing.owner_id !== ownerId) {
    return res.status(403).json({ error: 'Forbidden: You do not own this listing.' });
  }

  // Company authorization check
  if (req.user.company_id) {
    if (!checkCompanyPermission(req.user.id, req.user.company_id, ['owner', 'manager', 'listing_editor'])) {
      return res.status(403).json({ error: 'Forbidden: Insufficient company privileges to edit listing.' });
    }
  }

  if (title) listing.title = title;
  if (description) listing.description = description;
  if (attributes) listing.attributes = { ...listing.attributes, ...attributes };
  if (media) listing.media = media;

  // Run compliance scan again if title/description modified
  if (title || description) {
    let compliancePassed = true;
    let complianceSummary = 'Passed basic scans.';
    let detectedFlags = [];

    try {
      const aiRes = await fetch('http://localhost:8000/api/v1/ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: listing.title, 
          description: listing.description, 
          listing_type: listing.listing_type 
        })
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        compliancePassed = aiData.is_compliant;
        complianceSummary = aiData.summary;
        detectedFlags = aiData.flags;

        // Save compliance review
        mongoDb.cites_evaluations.push({
          id: uuidv4(),
          listing_title: listing.title,
          is_compliant: compliancePassed,
          summary: complianceSummary,
          flags: detectedFlags,
          recommendations: aiData.recommendations,
          cites_category: aiData.cites_category,
          checked_at: new Date().toISOString()
        });
        mongoDb.save();
      }
    } catch (e) {}

    listing.compliance_passed = compliancePassed;
    listing.compliance_flags = detectedFlags;
    listing.compliance_summary = complianceSummary;

    if (!compliancePassed) {
      listing.status = 'pending_verification';
    }
  }

  // Verify states before modifying status
  if (status) {
    const isOwnerVerified = req.user.phone_verified && req.user.id_proof_status === 'approved';
    if (status === 'published') {
      if (!isOwnerVerified) {
        listing.status = 'pending_verification';
      } else if (!listing.compliance_passed) {
        listing.status = 'pending_verification';
      } else {
        listing.status = 'published';
      }
    } else {
      listing.status = status;
    }
  }

  pgDb.save();

  res.status(200).json({
    message: 'Listing updated successfully.',
    listing
  });
});

// Delete a listing
router.delete('/:id', authenticateUser, (req, res) => {
  const listingId = req.params.id;
  const listingIdx = pgDb.listings.findIndex(l => l.id === listingId);

  if (listingIdx === -1) {
    return res.status(404).json({ error: 'Listing not found.' });
  }

  const listing = pgDb.listings[listingIdx];
  const ownerId = req.user.company_id || req.user.id;
  if (listing.owner_id !== ownerId) {
    return res.status(403).json({ error: 'Forbidden: You do not own this listing.' });
  }

  if (req.user.company_id) {
    if (!checkCompanyPermission(req.user.id, req.user.company_id, ['owner', 'manager', 'listing_editor'])) {
      return res.status(403).json({ error: 'Forbidden: Insufficient company privileges to delete listing.' });
    }
  }

  pgDb.listings.splice(listingIdx, 1);
  pgDb.save();

  res.status(200).json({ message: 'Listing deleted successfully.' });
});

export default router;
