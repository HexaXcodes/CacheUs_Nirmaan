// models/Medication.js
// Structured medication record. Entered from the patient's EXISTING prescription
// or clinician-provided information. NovaCare never invents, calculates, or
// recommends a medication, dosage, or schedule — it only stores and reminds.
const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true }, // e.g. "500mg", "2 puffs"
    form: {
      type: String,
      enum: ['tablet', 'capsule', 'inhaler', 'injection', 'liquid', 'drops', 'spray', 'topical', 'other'],
      default: 'other'
    },
    frequency: { type: String, trim: true }, // e.g. "twice daily", "every 8 hours"
    scheduledTimes: [{ type: String }], // e.g. ["08:00", "20:00"] — 24h local time strings

    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date }, // null/undefined = ongoing

    instructions: { type: String, trim: true }, // clinician instructions, e.g. "take with food"
    prescribedBy: { type: String, trim: true },

    active: { type: Boolean, default: true },
    reminderEnabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

medicationSchema.index({ user: 1, active: 1 });

module.exports = mongoose.model('Medication', medicationSchema);
