// models/MedicationLog.js
// One adherence entry per scheduled (or ad-hoc) dose event.
const mongoose = require('mongoose');

const medicationLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    medication: { type: mongoose.Schema.Types.ObjectId, ref: 'Medication', required: true, index: true },

    scheduledTime: { type: String, required: true }, // "08:00" — the slot this log corresponds to
    status: { type: String, enum: ['taken', 'skipped', 'missed'], required: true },
    takenAt: { type: Date }, // when actually marked taken (if status === 'taken')
    note: { type: String, trim: true }
  },
  { timestamps: true }
);

medicationLogSchema.index({ user: 1, medication: 1, createdAt: -1 });

module.exports = mongoose.model('MedicationLog', medicationLogSchema);
