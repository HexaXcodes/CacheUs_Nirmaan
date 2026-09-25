// routes/sessionRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createSession,
  getSession,
  listSessions,
  updateSession,
  addStepResult,
  completeSession
} = require('../controllers/sessionController');

router.use(protect); // every session route requires an authenticated patient

router.get('/', listSessions);
router.post('/', createSession);
router.get('/:id', getSession);
router.put('/:id', updateSession);
router.post('/:id/steps', addStepResult);
router.post('/:id/complete', completeSession);

module.exports = router;
