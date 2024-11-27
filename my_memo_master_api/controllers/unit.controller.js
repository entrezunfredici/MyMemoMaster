const unitService = require('../services/unit.service');

async function getAllUnits(req, res) {
    try {
        const units = await unitService.getAllUnits();
        res.status(200).json(units);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch units' });
    }
}

async function getUnitById(req, res) {
    try {
        const unit = await unitService.getUnitById(req.params.id);
        if (!unit) {
            res.status(404).json({ error: 'Unit not found' });
        } else {
            res.status(200).json(unit);
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch unit' });
    }
}

async function addUnit(req, res) {
    try {
        const { name, denomination, physicalQuantityId } = req.body;
        const newUnit = await unitService.addUnit({ name, denomination, physicalQuantityId });
        res.status(201).json(newUnit);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add unit' });
    }
}

module.exports = {
    getAllUnits,
    getUnitById,
    addUnit,
};
