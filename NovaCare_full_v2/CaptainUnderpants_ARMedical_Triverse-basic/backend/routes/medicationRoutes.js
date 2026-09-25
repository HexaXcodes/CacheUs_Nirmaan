// routes/medicationRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  listMedications,
  createMedication,
  getMedication,
  updateMedication,
  deleteMedication,
  logMedication,
  today,
  history
} = require('../controllers/medicationController');

router.use(protect); // medication data is sensitive — always authenticated

// Static sub-paths before the /:id param routes
router.get('/today', today);
router.get('/history', history);

router.get('/', listMedications);
router.post('/', createMedication);
router.get('/:id', getMedication);
router.put('/:id', updateMedication);
router.delete('/:id', deleteMedication);
router.post('/:id/log', logMedication);

module.exports = router;
