const roleService = require("../services/Role.service.js");

exports.findAll = async (req, res) => {
    try {
        const data = await roleService.findAll();
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({
            message: error || "Une erreur s'est produite lors de la récupération des rôles.",
        });
    }
};

exports.findOne = async (req, res) => {
    try {
        const data = await roleService.findOne(req.params.id);
        if (!data) {
            res.status(404).send({
                message: `Rôle introuvable pour l'identifiant ${req.params.id}.`,
            });
        } else {
            res.status(200).send(data);
        }
    } catch (error) {
        res.status(500).send({
            message: error || `Erreur lors de la récupération du rôle avec l'identifiant ${req.params.id}.`,
        });
    }
};

exports.create = async (req, res) => {
    try {
        const { name } = req.body;
        const data = await roleService.create({ name });
        res.status(201).send(data);
    } catch (error) {
        res.status(500).send({
            message: error || "Une erreur s'est produite lors de la création du rôle.",
        });
    }
};
