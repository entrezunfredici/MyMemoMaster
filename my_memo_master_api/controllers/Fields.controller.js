const FieldService = require('../services/Field.service');

/**
 * @swagger
 * /fields/add:
 *   post:
 *     summary: Ajouter un champ
 *     description: Ajoute un nouveau champ dans la base de données.
 *     tags: [Fields]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Field'
 *     responses:
 *       201:
 *         description: Champ ajouté avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Field'
 *       500:
 *         description: Erreur serveur
 */

exports.addField = async (req, res) => {
    try {
        const field = await FieldService.addField(req.body);
        res.status(201).json(field);
    } catch (error) {
        console.error('Erreur lors de l\'ajout du champ :', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @swagger
 * /fields/{id}:
 *   get:
 *     summary: Récupérer un champ par ID
 *     description: Récupère un champ spécifique en utilisant son ID.
 *     tags: [Fields]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'identifiant du champ
 *     responses:
 *       200:
 *         description: Champ trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Field'
 *       404:
 *         description: Champ non trouvé
 *       500:
 *         description: Erreur serveur
 */

exports.getFieldById = async (req, res) => {
    try {
        const field = await FieldService.getFieldById(req.params.id);
        if (!field) return res.status(404).json({ message: 'Champ non trouvé' });

        res.status(200).json(field);
    } catch (error) {
        console.error('Erreur lors de la récupération du champ :', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @swagger
 * /fields/{id}:
 *   put:
 *     summary: Mettre à jour un champ
 *     description: Met à jour un champ existant dans la base de données.
 *     tags: [Fields]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'identifiant du champ à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Field'
 *     responses:
 *       200:
 *         description: Champ mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Field'
 *       404:
 *         description: Champ non trouvé
 *       500:
 *         description: Erreur serveur
 */

exports.updateField = async (req, res) => {
    try {
        const field = await FieldService.updateField(req.params.id, req.body);
        res.status(200).json(field);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du champ :', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @swagger
 * /fields/{id}:
 *   delete:
 *     summary: Supprimer un champ
 *     description: Supprime un champ spécifique de la base de données.
 *     tags: [Fields]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'identifiant du champ à supprimer
 *     responses:
 *       204:
 *         description: Champ supprimé avec succès
 *       404:
 *         description: Champ non trouvé
 *       500:
 *         description: Erreur serveur
 */

exports.deleteField = async (req, res) => {
    try {
        await FieldService.deleteField(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error('Erreur lors de la suppression du champ :', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @swagger
 * /fields:
 *   get:
 *     summary: Récupérer tous les champs
 *     description: Récupère tous les champs enregistrés dans la base de données.
 *     tags: [Fields]
 *     responses:
 *       200:
 *         description: Liste des champs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Field'
 *       500:
 *         description: Erreur serveur
 */

exports.getAllFields = async (req, res) => {
    try {
        const fields = await FieldService.getAllFields();
        res.status(200).json(fields);
    } catch (error) {
        console.error('Erreur lors de la récupération des champs :', error.message);
        res.status(500).json({ message: error.message });
    }
};
