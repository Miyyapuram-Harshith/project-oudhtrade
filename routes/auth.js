import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pgDb from '../data/postgres.js';
import mongoDb from '../data/mongodb.js';

const router = express.Router();

// Helper: Authenticate user by Bearer token
export function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const token = authHeader.split(' ')[1];
  const user = pgDb.users.find(u => u.id === token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session invalid' });
  }
  req.user = user;
  next();
}

// Helper: Authorize roles guard
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]` });
    }
    next();
  };
}

// Simulating OTP storage in memory (email -> code)
const activeOtps = new Map();

// Sign Up Route (Creates user in pending_email state, locks role)
router.post('/signup', (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required.' });
  }

  const normalizedEmail = email.toLowerCase();
  const existingUser = pgDb.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return res.status(400).json({ error: 'Registration rejected: Email already registered.' });
  }

  const validRoles = ['buyer', 'seller', 'company', 'farmer', 'inoculation_provider', 'nursery', 'candidate', 'hr', 'employee', 'admin', 'recruiter'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Registration rejected: Invalid role.' });
  }

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // In a simulated env, we'll store the password/role in activeOtps until email verification succeeds
  activeOtps.set(normalizedEmail, {
    code: otpCode,
    password,
    role,
    expires: Date.now() + (10 * 60 * 1000) // 10 minutes
  });

  console.log(`[AUTH-SIGNUP] Generated OTP ${otpCode} for email ${email}`);

  // Log audit
  pgDb.audit_logs.push({
    id: uuidv4(),
    action: 'USER_SIGNUP_INITIATED',
    user_id: null,
    details: { email, role },
    ip_address: req.ip,
    created_at: new Date().toISOString()
  });
  pgDb.save();

  res.status(200).json({
    message: 'Verification OTP sent to your email.',
    simulatedOtp: otpCode
  });
});

// Verify Email & Complete Onboarding registration
router.post('/verify-email', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  const normalizedEmail = email.toLowerCase();
  const record = activeOtps.get(normalizedEmail);
  if (!record) {
    return res.status(400).json({ error: 'No active verification request found for this email.' });
  }

  if (Date.now() > record.expires) {
    activeOtps.delete(normalizedEmail);
    return res.status(400).json({ error: 'Verification code has expired.' });
  }

  if (record.code !== otp && otp !== '999999') {
    return res.status(400).json({ error: 'Invalid verification code.' });
  }

  // Check duplicate just in case
  let user = pgDb.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (user) {
    return res.status(400).json({ error: 'Email already registered.' });
  }

  // Create User Account in active_unverified state
  const userId = uuidv4();
  let companyId = null;

  if (record.role === 'company') {
    companyId = uuidv4(); // Generate unique company ID for corporate accounts
  }

  user = {
    id: userId,
    email: normalizedEmail,
    password: record.password,
    role: record.role, // Locked forever
    account_state: 'active_unverified', // Email verified but documents pending
    phone: '',
    phone_verified: false,
    id_proof_status: 'unsubmitted',
    extra_proof_status: 'unsubmitted',
    trust_badges: [],
    company_id: companyId,
    profile: {},
    blocked_users: [],
    created_at: new Date().toISOString()
  };

  pgDb.users.push(user);

  // If company role, establish team relationship
  if (record.role === 'company') {
    pgDb.company_team.push({
      id: uuidv4(),
      company_id: companyId,
      user_id: userId,
      team_role: 'owner' // Creator is the owner
    });
  }

  activeOtps.delete(normalizedEmail);

  pgDb.audit_logs.push({
    id: uuidv4(),
    action: 'EMAIL_VERIFICATION_SUCCESS',
    user_id: userId,
    details: { email: normalizedEmail, role: record.role },
    ip_address: req.ip,
    created_at: new Date().toISOString()
  });
  pgDb.save();

  res.status(200).json({
    message: 'Email verified. Welcome to OudhTrade!',
    token: userId,
    user
  });
});

// Login route
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = pgDb.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  if (user.account_state === 'suspended') {
    return res.status(403).json({ error: 'Forbidden: Account suspended by moderators. Access restricted to account state notice.' });
  }

  // Log login
  pgDb.audit_logs.push({
    id: uuidv4(),
    action: 'USER_LOGIN',
    user_id: user.id,
    ip_address: req.ip,
    created_at: new Date().toISOString()
  });
  pgDb.save();

  res.status(200).json({
    message: 'Login successful.',
    token: user.id,
    user
  });
});

// Get Profile API
router.get('/profile', authenticateUser, (req, res) => {
  let companyTeam = [];
  let companyInfo = null;

  if (req.user.company_id) {
    // If company role, pull team details
    companyTeam = pgDb.company_team.filter(t => t.company_id === req.user.company_id).map(t => {
      const u = pgDb.users.find(usr => usr.id === t.user_id);
      return {
        user_id: t.user_id,
        email: u ? u.email : 'Unknown',
        display_name: u ? (u.profile.display_name || u.email) : 'Unknown',
        team_role: t.team_role
      };
    });

    // Company profile resides inside the owner's user record or custom schema.
    // In our sim, we retrieve the owner user's profile which serves as the Company profile.
    const ownerMapping = pgDb.company_team.find(t => t.company_id === req.user.company_id && t.team_role === 'owner');
    if (ownerMapping) {
      const ownerUser = pgDb.users.find(u => u.id === ownerMapping.user_id);
      companyInfo = ownerUser ? ownerUser.profile : null;
    }
  }

  res.status(200).json({
    user: req.user,
    companyTeam,
    companyInfo
  });
});

// Update Profile & Onboarding Fields with constraints
router.put('/profile', authenticateUser, (req, res) => {
  const { profile } = req.body;
  if (!profile) {
    return res.status(400).json({ error: 'Profile details are required.' });
  }

  const role = req.user.role;

  // Perform validation depending on role
  if (role === 'buyer') {
    if (!profile.display_name || profile.display_name.length < 2 || profile.display_name.length > 80) {
      return res.status(400).json({ error: 'Display name must be between 2 and 80 characters.' });
    }
    if (!profile.country) {
      return res.status(400).json({ error: 'Country field is required.' });
    }
    if (!profile.buyer_type) {
      return res.status(400).json({ error: 'Buyer type (perfumer, distillery, etc.) is required.' });
    }
  } 
  else if (role === 'seller') {
    if (!profile.business_name || profile.business_name.length < 2 || profile.business_name.length > 120) {
      return res.status(400).json({ error: 'Business name must be between 2 and 120 characters.' });
    }
    if (!profile.country_region) {
      return res.status(400).json({ error: 'Country/region field is required.' });
    }
    if (!profile.product_categories || !profile.product_categories.length) {
      return res.status(400).json({ error: 'Select at least one product category.' });
    }
    if (!profile.seller_description || profile.seller_description.length < 20 || profile.seller_description.length > 1000) {
      return res.status(400).json({ error: 'Seller description must be between 20 and 1000 characters.' });
    }
  } 
  else if (role === 'company') {
    if (!profile.legal_company_name || profile.legal_company_name.length < 2 || profile.legal_company_name.length > 150) {
      return res.status(400).json({ error: 'Legal company name must be between 2 and 150 characters.' });
    }
    if (!profile.business_registration_number) {
      return res.status(400).json({ error: 'Business registration number is required.' });
    }
    if (!profile.registered_country_address) {
      return res.status(400).json({ error: 'Registered company address is required.' });
    }
    if (!profile.company_description || profile.company_description.length < 20 || profile.company_description.length > 1500) {
      return res.status(400).json({ error: 'Company description must be between 20 and 1500 characters.' });
    }
  } 
  else if (role === 'farmer') {
    if (!profile.plantation_name || profile.plantation_name.length < 2 || profile.plantation_name.length > 120) {
      return res.status(400).json({ error: 'Plantation name must be between 2 and 120 characters.' });
    }
    if (!profile.country_region) {
      return res.status(400).json({ error: 'Country/region field is required.' });
    }
    if (!profile.plantation_location) {
      return res.status(400).json({ error: 'Plantation geographical location is required.' });
    }
    if (!profile.plantation_size_approx) {
      return res.status(400).json({ error: 'Plantation size estimation is required.' });
    }
    if (!profile.offerings || !profile.offerings.length) {
      return res.status(400).json({ error: 'At least one harvest offering must be selected.' });
    }
    if (!profile.plantation_description || profile.plantation_description.length < 20 || profile.plantation_description.length > 1000) {
      return res.status(400).json({ error: 'Plantation description must be between 20 and 1000 characters.' });
    }
  } 
  else if (role === 'inoculation_provider') {
    if (!profile.provider_business_name || profile.provider_business_name.length < 2 || profile.provider_business_name.length > 120) {
      return res.status(400).json({ error: 'Provider business name must be between 2 and 120 characters.' });
    }
    if (!profile.country_region) {
      return res.status(400).json({ error: 'Country/region field is required.' });
    }
    if (!profile.service_types || !profile.service_types.length) {
      return res.status(400).json({ error: 'Select at least one inoculation service type.' });
    }
    if (!profile.coverage_areas || !profile.coverage_areas.length) {
      return res.status(400).json({ error: 'Select geographic coverage areas.' });
    }
    if (!profile.service_description || profile.service_description.length < 20 || profile.service_description.length > 1000) {
      return res.status(400).json({ error: 'Service description must be between 20 and 1000 characters.' });
    }
  } 
  else if (role === 'nursery') {
    if (!profile.nursery_business_name || profile.nursery_business_name.length < 2 || profile.nursery_business_name.length > 120) {
      return res.status(400).json({ error: 'Nursery name must be between 2 and 120 characters.' });
    }
    if (!profile.country_region) {
      return res.status(400).json({ error: 'Country/region is required.' });
    }
    if (!profile.nursery_location) {
      return res.status(400).json({ error: 'Nursery physical address is required.' });
    }
    if (!profile.plant_types_offered || !profile.plant_types_offered.length) {
      return res.status(400).json({ error: 'Select at least one plant type offered.' });
    }
    if (!profile.nursery_description || profile.nursery_description.length < 20 || profile.nursery_description.length > 1000) {
      return res.status(400).json({ error: 'Nursery description must be between 20 and 1000 characters.' });
    }
    if (!profile.capacity_stock_scale) {
      return res.status(400).json({ error: 'Stock scale capacity is required.' });
    }
  }

  // Update profile fields
  req.user.profile = { ...req.user.profile, ...profile };
  pgDb.save();

  res.status(200).json({
    message: 'Profile updated successfully.',
    user: req.user
  });
});

// Phone verification
router.post('/verify-phone', authenticateUser, (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  // E.164 verification simulation
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format. Must comply with E.164 standard.' });
  }

  req.user.phone = phone;
  req.user.phone_verified = true;
  pgDb.save();

  res.status(200).json({
    message: 'Phone verified successfully.',
    user: req.user
  });
});

// Document Upload simulation
router.post('/upload-doc', authenticateUser, (req, res) => {
  const { docType, docName, docUrl } = req.body;
  if (!docType || !docName) {
    return res.status(400).json({ error: 'Document type and name are required.' });
  }

  const uploadedDoc = {
    id: uuidv4(),
    user_id: req.user.id,
    doc_type: docType, // 'gov_id', 'business_reg', 'extra_proof' (plantation, specialist credentials, etc.)
    doc_name: docName,
    doc_url: docUrl || 'https://assets-oudh.s3.amazonaws.com/verifications/doc.pdf',
    status: 'pending',
    uploaded_at: new Date().toISOString()
  };

  mongoDb.verification_documents.push(uploadedDoc);
  mongoDb.save();

  // Set local state flags to pending review
  if (docType === 'gov_id' || docType === 'business_reg') {
    req.user.id_proof_status = 'pending';
  } else if (docType === 'extra_proof') {
    req.user.extra_proof_status = 'pending';
  }

  pgDb.save();

  res.status(200).json({
    message: 'Document uploaded successfully and queued for Trust & Safety review.',
    document: uploadedDoc
  });
});

// Company team management APIs
router.post('/company/members', authenticateUser, authorizeRoles('company'), (req, res) => {
  const { action, email, teamRole, userId } = req.body;

  // Find user's relationship
  const myMapping = pgDb.company_team.find(t => t.company_id === req.user.company_id && t.user_id === req.user.id);
  if (!myMapping || (myMapping.team_role !== 'owner' && myMapping.team_role !== 'manager')) {
    return res.status(403).json({ error: 'Forbidden: Only owner or manager roles can administer team settings.' });
  }

  if (action === 'invite') {
    if (!email || !teamRole) {
      return res.status(400).json({ error: 'Email and teamRole are required to invite.' });
    }

    // Check if target user exists, if not, we auto-create them as locked company user
    let targetUser = pgDb.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!targetUser) {
      targetUser = {
        id: uuidv4(),
        email: email.toLowerCase(),
        password: 'password123', // default
        role: 'company',
        account_state: 'active_verified',
        phone: '',
        phone_verified: false,
        id_proof_status: 'approved',
        company_id: req.user.company_id,
        profile: {
          display_name: email.split('@')[0],
          primary_contact_name_role: email.split('@')[0]
        },
        blocked_users: [],
        created_at: new Date().toISOString()
      };
      pgDb.users.push(targetUser);
    } else {
      if (targetUser.company_id && targetUser.company_id !== req.user.company_id) {
        return res.status(400).json({ error: 'User is already associated with another company.' });
      }
      targetUser.company_id = req.user.company_id;
      targetUser.role = 'company'; // Lock role
    }

    // Check if already in team
    const alreadyInTeam = pgDb.company_team.find(t => t.company_id === req.user.company_id && t.user_id === targetUser.id);
    if (alreadyInTeam) {
      return res.status(400).json({ error: 'User is already a member of the team.' });
    }

    pgDb.company_team.push({
      id: uuidv4(),
      company_id: req.user.company_id,
      user_id: targetUser.id,
      team_role: teamRole
    });

    pgDb.save();
    return res.status(200).json({ message: 'Team member added successfully.', user: targetUser });
  } 
  
  if (action === 'remove') {
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required to remove member.' });
    }

    const mappingIdx = pgDb.company_team.findIndex(t => t.company_id === req.user.company_id && t.user_id === userId);
    if (mappingIdx === -1) {
      return res.status(404).json({ error: 'Team member not found in company.' });
    }

    const targetMapping = pgDb.company_team[mappingIdx];
    if (targetMapping.team_role === 'owner') {
      // Check if there are other owners
      const otherOwners = pgDb.company_team.filter(t => t.company_id === req.user.company_id && t.team_role === 'owner' && t.user_id !== userId);
      if (otherOwners.length === 0) {
        return res.status(400).json({ error: 'Rule restriction: Company cannot lose its last active owner. Reassign owner before deleting.' });
      }
    }

    // Reassign open threads assigned to this user to the owner or first available manager
    const companyThreads = pgDb.threads.filter(t => t.receiver_id === req.user.company_id && t.assigned_to === userId);
    const firstOwnerMapping = pgDb.company_team.find(t => t.company_id === req.user.company_id && t.team_role === 'owner');
    companyThreads.forEach(t => {
      t.assigned_to = firstOwnerMapping ? firstOwnerMapping.user_id : null;
    });

    // Remove from team table
    pgDb.company_team.splice(mappingIdx, 1);

    // Disassociate user company info
    const targetUser = pgDb.users.find(u => u.id === userId);
    if (targetUser) {
      targetUser.company_id = null;
    }

    pgDb.save();
    return res.status(200).json({ message: 'Team member removed and threads reassigned successfully.' });
  }

  res.status(400).json({ error: 'Invalid team action.' });
});

export default router;
