const fieldTypeService = require("../services/FieldsType.service.js");

exports.findAll = async (req, res) => {
    try {
        const data = await fieldTypeService.findAll();
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({
            message: error.message || "Une erreur s'est produite lors de la récupération des types de champs.",
        });
    }
};

exports.findOne = async (req, res) => {
    try {
        const data = await fieldTypeService.findOne(req.params.id);
        if (!data) {
            res.status(404).send({
                message: `Type de champ introuvable pour l'identifiant ${req.params.id}.`,
            });
        } else {
            res.status(200).send(data);
        }
    } catch (error) {
        res.status(500).send({
            message: error.message || `Erreur lors de la récupération du type de champ avec l'identifiant ${req.params.id}.`,
        });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, allowunit } = req.body;
        if (!name || allowunit === undefined) {
            return res.status(400).send({ message: "Les champs 'Nom' et 'Unit' sont requis." });
        }

        const newFieldType = await fieldTypeService.create({ name, allowunit });
        res.status(201).send(newFieldType);
    } catch (error) {
        res.status(500).send({
            message: error.message || "Une erreur s'est produite lors de la création du type de champ.",
        });
    }
};
