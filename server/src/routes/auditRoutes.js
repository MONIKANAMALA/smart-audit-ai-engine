const express = require('express');
const AuditController = require('../controllers/AuditController');

const router = express.Router();
const controller = new AuditController();

router.post('/', (req, res) => controller.createEntry(req, res));
router.get('/', (req, res) => controller.listEntries(req, res));
router.get('/:id', (req, res) => controller.getEntry(req, res));
router.put('/:id', (req, res) => controller.updateEntry(req, res));
router.post('/:id/similar', (req, res) => controller.findSimilar(req, res));

module.exports = router;
