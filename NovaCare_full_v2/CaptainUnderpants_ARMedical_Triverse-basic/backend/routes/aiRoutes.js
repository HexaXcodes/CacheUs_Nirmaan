// routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const { explain, summary } = require('../controllers/aiController');
const { optionalAuth } = require('../middleware/authMiddleware');

// optionalAuth: guest/quick-start users still get coaching, just without
// medical-profile personalization
router.post('/explain', optionalAuth, explain);
router.post('/summary', optionalAuth, summary);

module.exports = router;
