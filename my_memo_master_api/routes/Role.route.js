const roles = require('../models/Role.model')
const rolesController = require('../controllers/Role.controller');

const router = require('express').Router();

router.get('/all', rolesController.findAll)

module.exports = router;