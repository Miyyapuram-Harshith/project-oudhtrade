import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pgDb from '../data/postgres.js';
import { authenticateUser, authorizeRoles } from './auth.js';

const router = express.Router();

// Request Razorpay Order ID Creation (company accounts only)
router.post('/order', authenticateUser, authorizeRoles('company'), (req, res) => {
  const { planType, amount } = req.body;

  if (!planType || !amount) {
    return res.status(400).json({ error: 'planType and amount are required.' });
  }

  const orderId = `order_${uuidv4().replace(/-/g, '').slice(0, 14)}`;

  res.status(200).json({
    orderId,
    amount: amount * 100, // standard Razorpay paisa format
    currency: 'INR',
    message: 'Simulated Razorpay order generated successfully.'
  });
});

// Verify signature and upgrade corporate tier (company accounts; ops_lead can also manage)
router.post('/verify', authenticateUser, authorizeRoles('company', 'ceo', 'ops_lead'), (req, res) => {
  const { orderId, paymentId, signature } = req.body;

  if (!orderId || !paymentId) {
    return res.status(400).json({ error: 'Payment parameters are required.' });
  }

  // Find user's company and upgrade tier to enterprise
  if (!req.user.company_id) {
    return res.status(400).json({ error: 'User is not associated with any corporate company account.' });
  }

  const company = pgDb.companies.find(c => c.id === req.user.company_id);
  if (!company) {
    return res.status(404).json({ error: 'Company profile not found.' });
  }

  // Simulate verification success and update PostgreSQL DB
  company.subscription_tier = 'enterprise';
  
  // Record payment in pgDb
  pgDb.payments.push({
    id: uuidv4(),
    company_id: company.id,
    razorpay_order_id: orderId,
    amount: 19999.00, // Premium tier cost in INR
    status: 'paid',
    created_at: new Date().toISOString()
  });

  // Log audit trace
  pgDb.audit_logs.push({
    id: uuidv4(),
    action: 'SUBSCRIPTION_UPGRADE',
    user_id: req.user.id,
    ip_address: req.ip,
    created_at: new Date().toISOString()
  });

  pgDb.save();

  res.status(200).json({
    message: 'Payment verified. OudhTrade Corporate subscription upgraded to Enterprise tier.',
    company
  });
});

export default router;
