const roleService = require("../services/Role.service.js");

exports.findAll = async (req, res) => {
    try {
        const data = await roleService.findAll();
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({
            message: error.message || "Une erreur s'est produite lors de la récupération des rôles.",
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
            message: error.message || `Erreur lors de la récupération du rôle avec l'identifiant ${req.params.id}.`,
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
            message: error.message || "Une erreur s'est produite lors de la création du rôle.",
        });
    }
};

exports.update = async (req, res) => {
    try {
        const updatedRole = await roleService.update(req.params.id, req.body);
        if (!updatedRole) {
            res.status(404).send({
                message: `Rôle introuvable pour l'identifiant ${req.params.id}.`,
            });
        } else {
            res.status(200).send(updatedRole);
        }
    } catch (error) {
        res.status(500).send({
            message: error.message || "Une erreur s'est produite lors de la mise à jour du rôle.",
        });
    }
}

exports.delete = async (req, res) => {
    try {
        const deleted = await roleService.delete(req.params.id);
        if (!deleted) {
            res.status(404).send({
                message: `Rôle introuvable pour l'identifiant ${req.params.id}.`,
            });
        } else {
            res.status(204).send();
        }
    } catch (error) {
        res.status(500).send({
            message: error.message || "Une erreur s'est produite lors de la suppression du rôle.",
        });
    }
}