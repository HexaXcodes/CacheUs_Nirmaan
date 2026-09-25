// models/ProcedureSession.js
// A single attempt at a supported procedure workflow (e.g. one inhaler-technique
// session). Step-by-step results are appended as the ML perception layer (or the
// mock ML endpoint, in dev) reports on each step.
const mongoose = require('mongoose');

const stepResultSchema = new mongoose.Schema(
  {
    stepId: { type: String, required: true },
    status: { type: String, enum: ['correct', 'incorrect', 'uncertain'], required: true },
    confidence: { type: Number, min: 0, max: 1 },
    errorCode: { type: String },
    timestamp: { type: Date, default: Date.now },
    attempts: { type: Number, default: 1 },
    metadata: { type: mongoose.Schema.Types.Mixed } // raw perception payload (objects/landmarks/bboxes), mock flag, etc.
  },
  { _id: false }
);

const procedureSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workflowId: { type: String, required: true },
    device: { type: String }, // resolved device variant, if the workflow has deviceVariants

    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },

    currentStep: { type: String },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned', 'unsupported'],
      default: 'in_progress'
    },

    stepResults: [stepResultSchema]
  },
  { timestamps: true }
);

procedureSessionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ProcedureSession', procedureSessionSchema);
