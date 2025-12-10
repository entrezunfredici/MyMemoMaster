const TutorialsService = require('../services/Tutorials.service');

/**
 * Controller pour la gestion des tutoriels
 * Gère les requêtes HTTP et délègue la logique métier au service
 */

/**
 * GET /tutorials/all
 * Récupère tous les tutoriels avec pagination et filtres
 * Query params: page, perPage, search, subjectId, revisionTips
 */
exports.findAll = async (req, res) => {
    try {
        const { page, perPage, search, subjectId, revisionTips } = req.query;
        
        const result = await TutorialsService.findAll({
            page,
            perPage,
            search,
            subjectId,
            revisionTips,
        });

        res.status(200).json({
            status: 'success',
            data: result.data,
            pagination: result.pagination,
        });
    } catch (error) {
        console.error('Erreur findAll tutorials:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Erreur lors de la récupération des tutoriels.',
        });
    }
};

/**
 * GET /tutorials/:id
 * Récupère un tutoriel par son ID
 */
exports.findOne = async (req, res) => {
    try {
        const tutorial = await TutorialsService.findOne(req.params.id);
        if (!tutorial) {
            return res.status(404).json({
                status: 'error',
                message: `Tutoriel introuvable pour l'identifiant ${req.params.id}.`,
            });
        }
        
        res.status(200).json({
            status: 'success',
            data: tutorial,
        });
    } catch (error) {
        console.error('Erreur findOne tutorial:', error);
        res.status(500).json({
            status: 'error',
            message: `Erreur lors de la récupération du tutoriel avec l'identifiant ${req.params.id}.`,
        });
    }
};

/**
 * POST /tutorials/add
 * Crée un nouveau tutoriel
 * Body: { name, link, idSubject, revision_tips }
 */
exports.create = async (req, res) => {
    try {
        const { name, link, idSubject, revision_tips } = req.body;
        
        // Validation basique
        if (!name || !link || !idSubject) {
            return res.status(400).json({
                status: 'error',
                message: 'Les champs name, link et idSubject sont obligatoires.',
            });
        }

        const tutorial = await TutorialsService.create({
            name,
            link,
            idSubject,
            revision_tips,
        });
        
        res.status(201).json({
            status: 'success',
            data: tutorial,
            message: 'Tutoriel créé avec succès.',
        });
    } catch (error) {
        console.error('Erreur create tutorial:', error);
        
        // Gestion des erreurs de validation Sequelize
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                status: 'error',
                message: 'Erreur de validation',
                errors: error.errors.map(e => ({
                    field: e.path,
                    message: e.message,
                })),
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: error.message || "Une erreur s'est produite lors de la création du tutoriel.",
        });
    }
};

/**
 * PUT /tutorials/:id
 * Met à jour un tutoriel par son ID
 * Body: { name?, link?, idSubject?, revision_tips? }
 */
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, link, idSubject, revision_tips } = req.body;

        const updatedTutorial = await TutorialsService.update(id, {
            name,
            link,
            idSubject,
            revision_tips,
        });
        
        if (!updatedTutorial) {
            return res.status(404).json({
                status: 'error',
                message: `Tutoriel introuvable pour l'identifiant ${id}.`,
            });
        }
        
        res.status(200).json({
            status: 'success',
            data: updatedTutorial,
            message: 'Tutoriel mis à jour avec succès.',
        });
    } catch (error) {
        console.error('Erreur update tutorial:', error);
        
        // Gestion des erreurs de validation Sequelize
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                status: 'error',
                message: 'Erreur de validation',
                errors: error.errors.map(e => ({
                    field: e.path,
                    message: e.message,
                })),
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: error.message || `Erreur lors de la mise à jour du tutoriel avec l'identifiant ${id}.`,
        });
    }
};

/**
 * DELETE /tutorials/:id
 * Supprime un tutoriel par son ID
 */
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await TutorialsService.delete(id);
        
        if (!deleted) {
            return res.status(404).json({
                status: 'error',
                message: `Tutoriel introuvable pour l'identifiant ${id}.`,
            });
        }
        
        res.status(200).json({
            status: 'success',
            message: `Tutoriel avec l'identifiant ${id} a été supprimé avec succès.`,
        });
    } catch (error) {
        console.error('Erreur delete tutorial:', error);
        res.status(500).json({
            status: 'error',
            message: `Erreur lors de la suppression du tutoriel avec l'identifiant ${req.params.id}.`,
        });
    }
};