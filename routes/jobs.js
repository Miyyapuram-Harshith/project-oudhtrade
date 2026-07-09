import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pgDb from '../data/postgres.js';
import { authenticateUser, authorizeRoles } from './auth.js';

const router = express.Router();

// Fetch all active jobs
router.get('/', (req, res) => {
  const activeJobs = pgDb.jobs.filter(j => j.is_active);
  const jobsWithCompany = activeJobs.map(j => {
    const comp = pgDb.companies.find(c => c.id === j.company_id);
    return {
      ...j,
      company_name: comp ? comp.name : 'Independent Recruiting'
    };
  });
  res.status(200).json(jobsWithCompany);
});

// Create a new job post (HR/Admin only)
router.post('/', authenticateUser, authorizeRoles('hr', 'admin'), (req, res) => {
  const { title, eligibility_criteria } = req.body;

  if (!title || !eligibility_criteria) {
    return res.status(400).json({ error: 'Title and eligibility criteria are required.' });
  }

  const newJob = {
    id: uuidv4(),
    company_id: req.user.company_id || 'company-uuid-stripe-000',
    title,
    eligibility_criteria,
    is_active: true,
    created_at: new Date().toISOString()
  };

  pgDb.jobs.push(newJob);

  pgDb.audit_logs.push({
    id: uuidv4(),
    action: 'JOB_CREATED',
    user_id: req.user.id,
    ip_address: req.ip,
    created_at: new Date().toISOString()
  });

  pgDb.save();
  res.status(201).json({ message: 'Job posted successfully.', job: newJob });
});

// Apply to a job (Candidates only)
router.post('/apply', authenticateUser, authorizeRoles('candidate'), (req, res) => {
  const { jobId, resumeUrl, profileDetails } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'Job ID is required to apply.' });
  }

  const job = pgDb.jobs.find(j => j.id === jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  // Check duplicate applications
  const existingApp = pgDb.applications.find(a => a.job_id === jobId && a.candidate_id === req.user.id);
  if (existingApp) {
    return res.status(400).json({ error: 'You have already applied for this position.' });
  }

  const app = {
    id: uuidv4(),
    job_id: jobId,
    candidate_id: req.user.id,
    resume_url: resumeUrl || 'https://assets-oudh.s3.amazonaws.com/resumes/dummy_resume.pdf',
    profile_details: profileDetails || {},
    status: 'assessment_pending',
    created_at: new Date().toISOString()
  };

  pgDb.applications.push(app);

  pgDb.audit_logs.push({
    id: uuidv4(),
    action: 'JOB_APPLIED',
    user_id: req.user.id,
    ip_address: req.ip,
    created_at: new Date().toISOString()
  });

  pgDb.save();
  res.status(201).json({ message: 'Application submitted successfully. Take assessment.', application: app });
});

// Fetch all applications (HR / Admin / Employees / Interviewers)
router.get('/applications', authenticateUser, authorizeRoles('hr', 'admin', 'employee', 'recruiter'), (req, res) => {
  const apps = pgDb.applications;
  
  const enrichedApps = apps.map(a => {
    const cand = pgDb.users.find(u => u.id === a.candidate_id);
    const job = pgDb.jobs.find(j => j.id === a.job_id);
    const result = pgDb.interview_results.find(r => r.application_id === a.id);
    
    return {
      ...a,
      candidate_email: cand ? cand.email : 'unknown@candidate.com',
      job_title: job ? job.title : 'Deleted Position',
      evaluation_result: result || null
    };
  });

  res.status(200).json(enrichedApps);
});

// Update Application Status (HR / Employee manual review / status updates)
router.patch('/applications/:id/status', authenticateUser, authorizeRoles('hr', 'admin', 'employee'), (req, res) => {
  const { status } = req.body;
  const appId = req.params.id;

  const app = pgDb.applications.find(a => a.id === appId);
  if (!app) {
    return res.status(404).json({ error: 'Application record not found.' });
  }

  const validStatuses = ['applied', 'assessment_pending', 'evaluation_pending', 'reviewed', 'rejected', 'accepted'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status state.' });
  }

  app.status = status;

  pgDb.audit_logs.push({
    id: uuidv4(),
    action: `APP_STATUS_UPDATED_${status.toUpperCase()}`,
    user_id: req.user.id,
    ip_address: req.ip,
    created_at: new Date().toISOString()
  });

  pgDb.save();
  res.status(200).json({ message: 'Application state updated successfully.', application: app });
});

export default router;
