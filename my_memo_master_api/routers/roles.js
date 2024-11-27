const roles = require('../models/roles')
const rolesController = require('../controllers/roles');

const router = require('express').Router();

router.get('/all', rolesController.getAllRoles)

module.exports = router;
