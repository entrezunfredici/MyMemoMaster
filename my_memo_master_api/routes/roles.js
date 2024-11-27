const roles = require('../models/roles')

const router = require('express').Router(),
rolesController = require('../controllers/rolesController')

router.get('/all', rolesController.getroles)
router.get('/id=:id', rolesController.getroleById)


module.exports = router;
