import express from 'express';
import pgDb from '../data/postgres.js';
import { authenticateUser } from './auth.js';

const router = express.Router();

// Fetch learning courses catalog
router.get('/', authenticateUser, (req, res) => {
  res.status(200).json(pgDb.courses);
});

// Fetch specific course lessons
router.get('/:id', authenticateUser, (req, res) => {
  const course = pgDb.courses.find(c => c.id === req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }
  res.status(200).json(course);
});

export default router;
