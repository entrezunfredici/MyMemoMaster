const roles = require('../models/Roles.models')
const rolesController = require('../controllers/Roles.controller');

const router = require('express').Router();

router.get('/all', rolesController.getAllRoles)

module.exports = router;
    