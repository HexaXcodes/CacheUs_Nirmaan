// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { updateMedicalInfo, getProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/profile', protect, getProfile);
router.put('/medical-info', protect, updateMedicalInfo);

module.exports = router;
