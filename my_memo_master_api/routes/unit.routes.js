const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unit.controller');

router.get('/unit/all', unitController.getAllUnits);
router.get('/unit/:id', unitController.getUnitById);
router.post('/scale/add', unitController.addUnit);

module.exports = router;
