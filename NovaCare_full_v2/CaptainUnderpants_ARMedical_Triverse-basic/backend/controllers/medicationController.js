// controllers/medicationController.js
// Structured medication CRUD + adherence logging. NovaCare never invents or
// recommends a medication/dose — all values here are entered by the patient
// from their existing prescription.
const asyncHandler = require('../middleware/asyncHandler');
const Medication = require('../models/Medication');
const MedicationLog = require('../models/MedicationLog');

const ALLOWED_FIELDS = [
  'name', 'dosage', 'form', 'frequency', 'scheduledTimes',
  'startDate', 'endDate', 'instructions', 'prescribedBy',
  'active', 'reminderEnabled'
];

function pickAllowed(body) {
  const out = {};
  for (const k of ALLOWED_FIELDS) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

async function loadOwnedMedication(req, res) {
  const med = await Medication.findById(req.params.id);
  if (!med) {
    res.status(404).json({ error: 'Medication not found' });
    return null;
  }
  if (String(med.user) !== String(req.user._id)) {
    res.status(403).json({ error: 'Not authorized to access this medication' });
    return null;
  }
  return med;
}

// GET /api/medications
exports.listMedications = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  const meds = await Medication.find(filter).sort({ createdAt: -1 });
  res.json(meds);
});

// POST /api/medications
exports.createMedication = asyncHandler(async (req, res) => {
  const { name, dosage } = req.body;
  if (!name || !dosage) return res.status(400).json({ error: 'name and dosage are required' });

  const med = await Medication.create({ user: req.user._id, ...pickAllowed(req.body) });
  res.status(201).json(med);
});

// GET /api/medications/:id
exports.getMedication = asyncHandler(async (req, res) => {
  const med = await loadOwnedMedication(req, res);
  if (!med) return;
  res.json(med);
});

// PUT /api/medications/:id
exports.updateMedication = asyncHandler(async (req, res) => {
  const med = await loadOwnedMedication(req, res);
  if (!med) return;

  Object.assign(med, pickAllowed(req.body));
  await med.save();
  res.json(med);
});

// DELETE /api/medications/:id
exports.deleteMedication = asyncHandler(async (req, res) => {
  const med = await loadOwnedMedication(req, res);
  if (!med) return;

  await med.deleteOne();
  res.json({ message: 'Medication deleted' });
});

// POST /api/medications/:id/log
exports.logMedication = asyncHandler(async (req, res) => {
  const med = await loadOwnedMedication(req, res);
  if (!med) return;

  const { scheduledTime, status, takenAt, note } = req.body;
  if (!scheduledTime) return res.status(400).json({ error: 'scheduledTime is required' });
  if (!['taken', 'skipped', 'missed'].includes(status))
    return res.status(400).json({ error: "status must be 'taken', 'skipped', or 'missed'" });

  const log = await MedicationLog.create({
    user: req.user._id,
    medication: med._id,
    scheduledTime,
    status,
    takenAt: status === 'taken' ? takenAt || new Date() : takenAt,
    note
  });

  res.status(201).json(log);
});

// GET /api/medications/today
// Returns each active medication's scheduled dose slots for today (the
// frontend is responsible for actual local-time notification scheduling).
exports.today = asyncHandler(async (req, res) => {
  const now = new Date();
  const meds = await Medication.find({
    user: req.user._id,
    active: true,
    startDate: { $lte: now },
    $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }]
  });

  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

  const todaysLogs = await MedicationLog.find({
    user: req.user._id,
    medication: { $in: meds.map((m) => m._id) },
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });

  const schedule = [];
  for (const med of meds) {
    for (const time of med.scheduledTimes || []) {
      const log = todaysLogs.find((l) => String(l.medication) === String(med._id) && l.scheduledTime === time);
      schedule.push({
        medicationId: med._id,
        name: med.name,
        dosage: med.dosage,
        form: med.form,
        instructions: med.instructions,
        scheduledTime: time,
        status: log ? log.status : 'pending',
        logId: log ? log._id : null
      });
    }
  }
  schedule.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  res.json({ date: startOfDay.toISOString().slice(0, 10), schedule });
});

// GET /api/medications/history
exports.history = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.medicationId) filter.medication = req.query.medicationId;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const logs = await MedicationLog.find(filter).populate('medication', 'name dosage form').sort({ createdAt: -1 }).limit(500);
  res.json(logs);
});
