// routes/mlRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { verify, mockVerify, inhalerPredict } = require('../controllers/mlController');

router.use(protect); // ML results are written into a user's own session

router.post('/verification', verify);
router.post('/mock', mockVerify); // dev/demo only — see controller for the guard
router.post('/inhaler/predict', inhalerPredict); // proxies to the internal Python frame classifier

module.exports = router;
