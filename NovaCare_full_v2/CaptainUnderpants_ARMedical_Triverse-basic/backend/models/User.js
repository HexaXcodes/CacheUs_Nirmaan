// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },

    // Medical profile (used for AI coaching personalization — never for diagnosis)
    medicalInfo: {
      age: Number,
      gender: String,
      bloodGroup: String,
      conditions: [String], // e.g. ["diabetes", "hypertension"]
      allergies: [String],  // e.g. ["penicillin"]
      notes: String
      // NOTE: the old free-text `medications` string list has been removed.
      // Medications are now structured records — see models/Medication.js.
    },

    // Uploaded reports — prescriptions, lab reports, prior records (file paths only, not parsed)
    reports: [
      {
        filename: String,
        originalName: String,
        path: String,
        mimetype: String,
        category: {
          type: String,
          enum: ['prescription', 'lab_report', 'medical_record', 'other'],
          default: 'other'
        },
        uploadedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password helper
userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
