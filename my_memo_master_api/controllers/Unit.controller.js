const unitService = require("../services/Unit.service");
const logger = require("../helpers/logger");

async function getAllUnits(req, res) {
  try {
    const units = await unitService.getAllUnits();
    res.status(200).json(units);
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la récupération des unités." });
  }
}

async function getUnitById(req, res) {
  try {
    const unit = await unitService.getUnitById(req.params.id);
    if (!unit) {
      res.status(404).json({ message: "Unité introuvable." });
    } else {
      res.status(200).json(unit);
    }
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la récupération de l'unité." });
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
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la création de l'unité." });
  }
}

async function updateUnit(req, res) {
  try {
    const updatedUnit = await unitService.updateUnit(req.params.id, req.body);
    if (!updatedUnit) {
      res.status(404).json({ message: "Unité introuvable." });
    } else {
      res.status(200).json(updatedUnit);
    }
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'unité." });
  }
}

async function deleteUnit(req, res) {
  try {
    const deleted = await unitService.deleteUnit(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: "Unité introuvable." });
    } else {
      res.status(200).json({ message: "Unité supprimée avec succès." });
    }
  } catch (error) {
    logger.error(error?.message || error);
    res.status(500).json({ message: "Erreur lors de la suppression de l'unité." });
  }
}

module.exports = {
  getAllUnits,
  getUnitById,
  addUnit,
  updateUnit,
  deleteUnit,
};
