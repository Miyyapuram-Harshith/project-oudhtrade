/**
 * OudhTrade — Jobs/Courses Module (Deprecated / Not Active)
 * 
 * OudhTrade is a listing-only B2B agarwood trade directory.
 * This module is not active in the current platform version.
 * Reserved for future implementation of OudhTrade Academy / Knowledge Hub.
 */
import express from 'express';
const router = express.Router();

// All routes return 404 gracefully
router.use((req, res) => {
  res.status(404).json({ 
    message: 'OudhTrade does not currently offer job listings. This platform is a global agarwood trade directory.' 
  });
});

export default router;
