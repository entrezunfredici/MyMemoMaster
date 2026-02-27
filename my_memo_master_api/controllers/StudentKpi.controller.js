// controllers/StudentKpi.controller.js
const StudentKpiService = require("../services/StudentKpi.service");

exports.getKpi = async (req, res) => {
    try {
        const kpi = await StudentKpiService.compute(req.user.id, req.query);
        res.status(200).json(kpi);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur interne du serveur" });
    }
};

exports.findAll = async (req, res) => {
    try {
        const records = await StudentKpiService.findAll(req.user.id, req.query);
        res.status(200).json(records);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur interne du serveur" });
    }
};

exports.create = async (req, res) => {
    try {
        const { leitnerCardId, subjectId } = req.body;
        if (!leitnerCardId) {
            return res.status(400).json({ message: "leitnerCardId requis" });
        }
        const record = await StudentKpiService.create(req.user.id, { leitnerCardId, subjectId });
        res.status(201).json(record);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur interne du serveur" });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await StudentKpiService.findOne(id, req.user.id);
        if (!record) return res.status(404).json({ message: "Enregistrement non trouvé" });

        const updated = await StudentKpiService.update(id, req.user.id, req.body);
        res.status(200).json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur interne du serveur" });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await StudentKpiService.findOne(id, req.user.id);
        if (!record) return res.status(404).json({ message: "Enregistrement non trouvé" });

        await StudentKpiService.delete(id, req.user.id);
        res.status(200).json({ message: "Enregistrement supprimé" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur interne du serveur" });
    }
};