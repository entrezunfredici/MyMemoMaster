const unitService = require("../services/Unit.service");

async function getAllUnits(req, res) {
  try {
    const units = await unitService.getAllUnits();
    res.status(200).json(units);
  } catch (error) {
    console.error(error?.message || error);
    res.status(500).json({ error: "Failed to fetch units" });
  }
}

async function getUnitById(req, res) {
  try {
    const unit = await unitService.getUnitById(req.params.id);
    if (!unit) {
      res.status(404).json({ error: "Unit not found" });
    } else {
      res.status(200).json(unit);
    }
  } catch (error) {
    console.error(error?.message || error);
    res.status(500).json({ error: "Failed to fetch unit" });
  }
}

async function addUnit(req, res) {
  try {
    const { name, denomination, physicalQuantityName } = req.body;
    const newUnit = await unitService.addUnit({
      name,
      denomination,
      physicalQuantityName,
    });
    res.status(201).json(newUnit);
  } catch (error) {
    console.error(error?.message || error);
    res.status(500).json({ error: "Failed to add unit" });
  }
}

async function updateUnit(req, res) {
  try {
    const updatedUnit = await unitService.updateUnit(req.params.id, req.body);
    if (!updatedUnit) {
      res.status(404).json({ error: "Unit not found" });
    } else {
      res.status(200).json(updatedUnit);
    }
  } catch (error) {
    console.error(error?.message || error);
    res.status(500).json({ error: "Failed to update unit" });
  }
}

async function deleteUnit(req, res) {
  try {
    const deleted = await unitService.deleteUnit(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Unit not found" });
    } else {
      res.status(200).json({ message: "Unit deleted successfully" });
    }
  } catch (error) {
    console.error(error?.message || error);
    res.status(500).json({ error: "Failed to delete unit" });
  }
}

module.exports = {
  getAllUnits,
  getUnitById,
  addUnit,
  updateUnit,
  deleteUnit,
};
