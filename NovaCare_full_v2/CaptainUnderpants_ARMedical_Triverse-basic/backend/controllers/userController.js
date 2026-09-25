// controllers/userController.js
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

// PUT /api/user/medical-info
exports.updateMedicalInfo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Whitelist fields to prevent injection
  const allowed = ['age', 'gender', 'bloodGroup', 'conditions', 'allergies', 'notes'];
  const update = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  user.medicalInfo = { ...user.medicalInfo, ...update };
  await user.save();
  res.json({
    message: 'Medical info updated',
    medicalInfo: user.medicalInfo
  });
});

// GET /api/user/profile
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json(user);
});
