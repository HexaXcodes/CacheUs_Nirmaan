// routes/reportRoutes.js
// Preserves the original report-upload architecture (multer -> disk ->
// User.reports subdocument), just moved under /api/reports per the new API
// organization. Reports can represent prescriptions, lab reports, or other
// supporting documents — report analysis is intentionally NOT the product.
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ok = /pdf|doc|docx|txt|jpg|jpeg|png/i.test(path.extname(file.originalname));
    if (ok) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, TXT, JPG, PNG allowed'));
  }
});

const ALLOWED_CATEGORIES = ['prescription', 'lab_report', 'medical_record', 'other'];

// POST /api/reports  — multipart, field name "report", optional "category"
router.post('/', protect, upload.single('report'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const category = ALLOWED_CATEGORIES.includes(req.body.category) ? req.body.category : 'other';

  const user = await User.findById(req.user._id);
  const reportEntry = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: `/uploads/${req.file.filename}`,
    mimetype: req.file.mimetype,
    category
  };
  user.reports.push(reportEntry);
  await user.save();

  res.json({
    message: 'Report uploaded successfully',
    report: reportEntry,
    totalReports: user.reports.length
  });
}));

// GET /api/reports — list the current user's own reports only
router.get('/', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json(user.reports);
}));

module.exports = router;
