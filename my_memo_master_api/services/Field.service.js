const { Field } = require('../models/index'); // Importation du modèle Field

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
     *                   name:
     *                     type: string
     *                     example: "Nom du champ"
     *                   numericValue:
     *                     type: number
     *                     example: 42.5
     *                   textValue:
     *                     type: string
     *                     example: "Texte du champ"
     *                   fieldLetter:
     *                     type: string
     *                     example: "A"
     *                   valueSaved:
     *                     type: boolean
     *                     example: true
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
     *                 name:
     *                   type: string
     *                   example: "Nom du champ"
     *                 numericValue:
     *                   type: number
     *                   example: 42.5
     *                 textValue:
     *                   type: string
     *                   example: "Texte du champ"
     *                 fieldLetter:
     *                   type: string
     *                   example: "A"
     *                 valueSaved:
     *                   type: boolean
     *                   example: true
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
     *     summary: Ajouter un nouveau champ
     *     tags: [FieldService]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *                 example: "Nom du champ"
     *               numericValue:
     *                 type: number
     *                 example: 42.5
     *               textValue:
     *                 type: string
     *                 example: "Texte du champ"
     *               fieldLetter:
     *                 type: string
     *                 example: "A"
     *               valueSaved:
     *                 type: boolean
     *                 example: true
     *               idType:
     *                 type: integer
     *                 example: 2
     *               idUnit:
     *                 type: integer
     *                 example: 3
     *               idUser:
     *                 type: integer
     *                 example: 5
     *     responses:
     *       201:
     *         description: Champ ajouté avec succès.
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
     *     summary: Modifier un champ existant par ID
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
     *               name:
     *                 type: string
     *                 example: "Nom modifié"
     *               numericValue:
     *                 type: number
     *                 example: 55.2
     *               textValue:
     *                 type: string
     *                 example: "Texte modifié"
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
