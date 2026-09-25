// routes/workflowRoutes.js
const express = require('express');
const router = express.Router();
const { listWorkflows, getWorkflow } = require('../controllers/workflowController');

router.get('/', listWorkflows);
router.get('/:id', getWorkflow);

module.exports = router;
