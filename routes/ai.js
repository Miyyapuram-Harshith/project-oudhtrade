import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pgDb from '../data/postgres.js';
import mongoDb from '../data/mongodb.js';
import { authenticateUser, authorizeRoles } from './auth.js';

const router = express.Router();

// Candidate Submits AI Interview Answers
router.post('/interview/submit', authenticateUser, authorizeRoles('candidate'), async (req, res) => {
  const { applicationId, answers } = req.body; // answers is an array of { questionId, question, content }

  if (!applicationId || !answers || !answers.length) {
    return res.status(400).json({ error: 'applicationId and interview answers are required.' });
  }

  const application = pgDb.applications.find(a => a.id === applicationId);
  if (!application) {
    return res.status(404).json({ error: 'Associated application not found.' });
  }

  try {
    console.log(`[NODE BACKEND] Forwarding interview media to Django AI engine on port 8000...`);
    
    // Call Python/Django AI engine microservice (on port 8000)
    const djangoRes = await fetch('http://localhost:8000/api/v1/ai/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: req.user.id,
        job_id: application.job_id,
        answers
      })
    });

    if (!djangoRes.ok) {
      throw new Error(`Django AI microservice failed: ${djangoRes.statusText}`);
    }

    const aiData = await djangoRes.json();

    // 1. Save Unstructured Documents to MongoDB Simulator
    const mongoReportId = uuidv4();
    
    // Add to MongoDB AI Reports collection
    mongoDb.ai_reports.push({
      id: mongoReportId,
      application_id: applicationId,
      candidate_id: req.user.id,
      summary: aiData.ai_report.summary,
      strengths: aiData.ai_report.strengths,
      weaknesses: aiData.ai_report.weaknesses,
      created_at: new Date().toISOString()
    });

    // Add to MongoDB Speech Transcripts collection
    mongoDb.speech_transcripts.push({
      id: uuidv4(),
      report_id: mongoReportId,
      application_id: applicationId,
      transcripts: aiData.speech_transcripts,
      created_at: new Date().toISOString()
    });

    // Add to MongoDB Emotion Timeline collection
    mongoDb.emotion_timelines.push({
      id: uuidv4(),
      report_id: mongoReportId,
      application_id: applicationId,
      timeline: aiData.emotion_timeline,
      created_at: new Date().toISOString()
    });

    // Save MongoDB state
    mongoDb.save();

    // 2. Save Relational Scores in PostgreSQL Simulator
    const newResult = {
      id: uuidv4(),
      application_id: applicationId,
      overall_score: aiData.overall_score,
      cognitive_score: aiData.cognitive_score,
      communication_score: aiData.communication_score,
      technical_score: aiData.technical_score,
      mongodb_report_id: mongoReportId,
      created_at: new Date().toISOString()
    };
    pgDb.interview_results.push(newResult);

    // Update application status to evaluation_pending (awaiting manual verify) or reviewed
    application.status = 'evaluation_pending';

    // Log action
    pgDb.audit_logs.push({
      id: uuidv4(),
      action: 'AI_EVALUATION_COMPLETED',
      user_id: req.user.id,
      ip_address: req.ip,
      created_at: new Date().toISOString()
    });

    pgDb.save();

    res.status(200).json({
      message: 'AI Evaluation completed successfully. Results updated in records.',
      overallScore: aiData.overall_score,
      cognitiveScore: aiData.cognitive_score,
      communicationScore: aiData.communication_score,
      technicalScore: aiData.technical_score,
      reportId: mongoReportId
    });

  } catch (error) {
    console.error('[NODE CORE] Error connecting to Django AI service:', error.message);
    res.status(502).json({
      error: 'AI Gateway Error',
      message: 'Django AI Engine was unreachable or encountered an error processing Whisper/OpenCV algorithms.'
    });
  }
});

// Fetch detailed AI assessment reports from PostgreSQL + MongoDB (HR/Employee/Admin only)
router.get('/reports/:mongoReportId', authenticateUser, authorizeRoles('hr', 'admin', 'employee', 'recruiter'), (req, res) => {
  const { mongoReportId } = req.params;

  const pgScore = pgDb.interview_results.find(r => r.mongodb_report_id === mongoReportId);
  if (!pgScore) {
    return res.status(404).json({ error: 'Score card not found in relational records.' });
  }

  const reportDoc = mongoDb.ai_reports.find(r => r.id === mongoReportId);
  const transcriptDoc = mongoDb.speech_transcripts.find(t => t.report_id === mongoReportId);
  const timelineDoc = mongoDb.emotion_timelines.find(e => e.report_id === mongoReportId);

  res.status(200).json({
    reportId: mongoReportId,
    overallScore: pgScore.overall_score,
    cognitiveScore: pgScore.cognitive_score,
    communicationScore: pgScore.communication_score,
    technicalScore: pgScore.technical_score,
    summary: reportDoc ? reportDoc.summary : '',
    strengths: reportDoc ? reportDoc.strengths : [],
    weaknesses: reportDoc ? reportDoc.weaknesses : [],
    transcripts: transcriptDoc ? transcriptDoc.transcripts : [],
    timeline: timelineDoc ? timelineDoc.timeline : []
  });
});

export default router;
