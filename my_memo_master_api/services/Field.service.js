const { Field } = require('../models/Fields.model');

/**
 * @swagger
 * tags:
 *   name: FieldService
 *   description: Gestion des champs via le service
 */
class FieldService {
    /**
     * @swagger
     * /service/fields/all:
     *   get:
     *     summary: Récupérer tous les champs
     *     tags: [FieldService]
     *     responses:
     *       200:
     *         description: Liste de tous les champs récupérée avec succès.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   id:
     *                     type: integer
     *                     example: 1
     *                   fieldValue:
     *                     type: string
     *                     example: "Exemple"
     *                   fieldChar:
     *                     type: string
     *                     example: "A"
     *                   fieldLetter:
     *                     type: string
     *                     example: "A"
     *                   valueSaved:
     *                     type: boolean
     *                     example: true
     *                   idType:
     *                     type: integer
     *                     example: 1
     */
    async findAll() {
        try {
            return await Field.findAll();
        } catch (error) {
            throw new Error('Erreur lors de la récupération des champs');
        }
    }

    /**
     * @swagger
     * /service/fields/{id}:
     *   get:
     *     summary: Récupérer un champ par ID
     *     tags: [FieldService]
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *           example: 1
     *         description: ID unique du champ.
     *     responses:
     *       200:
     *         description: Champ trouvé avec succès.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   type: integer
     *                   example: 1
     *                 fieldValue:
     *                   type: string
     *                   example: "Exemple"
     *                 fieldChar:
     *                   type: string
     *                   example: "A"
     *                 fieldLetter:
     *                   type: string
     *                   example: "A"
     *                 valueSaved:
     *                   type: boolean
     *                   example: true
     *                 idType:
     *                   type: integer
     *                   example: 1
     *       404:
     *         description: Champ introuvable.
     */
    async findOne(id) {
        try {
            const field = await Field.findByPk(id);
            if (!field) {
                throw new Error('Champ non trouvé');
            }
            return field;
        } catch (error) {
            throw new Error('Erreur lors de la récupération du champ');
        }
    }

    /**
     * @swagger
     * /service/fields/add:
     *   post:
     *     summary: Créer un nouveau champ
     *     tags: [FieldService]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               fieldValue:
     *                 type: string
     *                 example: "Exemple Value"
     *               fieldChar:
     *                 type: string
     *                 example: "A"
     *               fieldLetter:
     *                 type: string
     *                 example: "A"
     *               valueSaved:
     *                 type: boolean
     *                 example: true
     *               idType:
     *                 type: integer
     *                 example: 1
     *     responses:
     *       201:
     *         description: Champ créé avec succès.
     *       400:
     *         description: Requête invalide.
     */
    async create(data) {
        try {
            return await Field.create(data);
        } catch (error) {
            throw new Error('Erreur lors de la création du champ');
        }
    }

    /**
     * @swagger
     * /service/fields/{id}:
     *   put:
     *     summary: Mettre à jour un champ par ID
     *     tags: [FieldService]
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *           example: 1
     *         description: ID unique du champ.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               fieldValue:
     *                 type: string
     *                 example: "Updated Value"
     *               fieldChar:
     *                 type: string
     *                 example: "B"
     *               fieldLetter:
     *                 type: string
     *                 example: "B"
     *               valueSaved:
     *                 type: boolean
     *                 example: false
     *               idType:
     *                 type: integer
     *                 example: 2
     *     responses:
     *       200:
     *         description: Champ mis à jour avec succès.
     *       404:
     *         description: Champ introuvable.
     */
    async update(id, updateData) {
        try {
            const field = await Field.findOne({ where: { id } });
            if (!field) {
                throw new Error('Champ non trouvé');
            }
            return await field.update(updateData);
        } catch (error) {
            throw new Error('Erreur lors de la mise à jour du champ');
        }
    }

    /**
     * @swagger
     * /service/fields/{id}:
     *   delete:
     *     summary: Supprimer un champ par ID
     *     tags: [FieldService]
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *           example: 1
     *         description: ID unique du champ.
     *     responses:
     *       200:
     *         description: Champ supprimé avec succès.
     *       404:
     *         description: Champ introuvable.
     */
    async delete(id) {
        try {
            const field = await Field.findOne({ where: { id } });
            if (!field) {
                throw new Error('Champ non trouvé');
            }
            await field.destroy();
            return { message: 'Champ supprimé avec succès' };
        } catch (error) {
            throw new Error('Erreur lors de la suppression du champ');
        }
    }
}

module.exports = new FieldService();
