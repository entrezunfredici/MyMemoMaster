const TutorialsService = require('../services/Tutorials.service');

exports.findAll = async (req, res) => {
    let { page, perPage, search, subjectId, revisionTips } = req.query;
    try {
        // Pagination
        const tutorialsCount = await TutorialsService.count({ search, subjectId, revisionTips });
        const pagination = {
            page: parseInt(page) || 1,
            perPage: parseInt(perPage) || 10,
            total: Math.ceil(tutorialsCount / (parseInt(perPage) || 10)),
        };
        const offset = (pagination.page - 1) * pagination.perPage;

        // Construct the where clause
        let where = {};
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                // { description: { [Op.like]: `%${search}%` } },
            ];
        }
        if (subjectId) {
            where.subjectId = subjectId;
        }
        if (revisionTips !== undefined) {
            where.revisionTips = revisionTips;
        }

        const tutorials = await TutorialsService.findAll({ where, offset, limit: pagination.perPage });

        res.status(200).json({
            status: 'success',
            data: tutorials,
            pagination,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

exports.findOne = async (req, res) => {
    try {
        const tutorial = await TutorialsService.findOne(req.params.id);
        if (!tutorial) {
            res.status(404).json({
                status: 'error',
                message: `Tutorial introuvable pour l'identifiant ${req.params.id}.`,
            });
        } else {
            res.status(200).json({
                status: 'success',
                data: tutorial,
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: `Erreur lors de la récupération du tutoriel avec l'identifiant ${req.params.id}.`,
        });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, link } = req.body;
        const data = await TutorialsService.create({ name, link });
        res.status(201).json({
            status: 'success',
            data,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: "Une erreur s'est produite lors de la création du tutoriel.",
        });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const newData = req.body;
        const updatedTutorial = await TutorialsService.update(id, newData);
        if (!updatedTutorial) {
            res.status(404).json({
                status: 'error',
                message: `Tutorial introuvable pour l'identifiant ${id}.`,
            });
        } else {
            res.status(200).json({
                status: 'success',
                data: updatedTutorial,
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: `Erreur lors de la mise à jour du tutoriel avec l'identifiant ${req.params.id}.`,
        });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await TutorialsService.delete(id);
        if (!deleted) {
            res.status(404).json({
                status: 'error',
                message: `Tutorial introuvable pour l'identifiant ${id}.`,
            });
        } else {
            res.status(200).json({
                status: 'success',
                message: `Tutorial avec l'identifiant ${id} a été supprimé.`,
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: `Erreur lors de la suppression du tutoriel avec l'identifiant ${req.params.id}.`,
        });
    }
};