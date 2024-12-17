const { Unit } = require("../models");

async function getAllUnits() {
  return await Unit.findAll();
}

async function getUnitById(id) {
  return await Unit.findByPk(id);
}

async function addUnit(data) {
  return await Unit.create(data);
}

async function updateUnit(id, newData) {
  const unit = await Unit.findByPk(id);
  if (unit) {
    await unit.update(newData);
    return unit;
  }
  return null;
}

async function deleteUnit(id) {
  const unit = await Unit.findByPk(id);
  if (unit) {
    await unit.destroy();
    return true;
  }
  return false;
}

module.exports = {
  getAllUnits,
  getUnitById,
  addUnit,
  updateUnit,
  deleteUnit,
};
