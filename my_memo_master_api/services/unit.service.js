const { Unit } = require('../models');

async function getAllUnits() {
    return await Unit.findAll();
}

async function getUnitById(id) {
    return await Unit.findByPk(id);
}

async function addUnit(data) {
    return await Unit.create(data);
}

module.exports = {
    getAllUnits,
    getUnitById,
    addUnit,
};
