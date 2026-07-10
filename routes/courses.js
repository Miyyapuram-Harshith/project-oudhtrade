/**
 * OudhTrade — Courses/Academy Module (Reserved for Future Use)
 * 
 * Future OudhTrade Academy will include educational content on:
 * - CITES compliance for agarwood trading
 * - Aquilaria species cultivation techniques  
 * - International export documentation
 * - Agarwood quality grading standards
 */
import express from 'express';
const router = express.Router();

// Placeholder educational content
const placeholderCourses = [
  {
    id: 'course-cites-101',
    title: 'CITES Appendix II: Agarwood Trade Compliance',
    description: 'Understanding CITES regulations for Aquilaria and Gyrinops genus trade.',
    category: 'Regulatory Compliance',
    available: false,
    coming_soon: true
  },
  {
    id: 'course-aquilaria-201',
    title: 'Aquilaria Plantation Best Practices',
    description: 'Sustainable cultivation and inoculation techniques for premium agarwood yield.',
    category: 'Cultivation Science',
    available: false,
    coming_soon: true
  }
];

// GET /api/v1/courses — list upcoming educational content
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'OudhTrade Academy is coming soon.',
    courses: placeholderCourses
  });
});

export default router;
