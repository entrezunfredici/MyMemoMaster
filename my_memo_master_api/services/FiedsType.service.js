const { FieldType } = require('../models/FieldType.model');  // Importation du modèle FieldType

/**
 * @swagger
 * tags:
 *   name: FieldTypeService
 *   description: Gestion des types de champs via le service
 */
class FieldTypeService {
    /**
     * @swagger
     * /service/fieldTypes/all:
     *   get:
     *     summary: Récupérer tous les types de champs
     *     tags: [FieldTypeService]
     *     responses:
     *       200:
     *         description: Liste de tous les types de champs récupérée avec succès.
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
     *                     example: "Texte"
     *                   separation:
     *                     type: string
     *                     example: ","
     *                   allowFloat:
     *                     type: boolean
     *                     example: true
     *                   allowCharacters:
     *                     type: boolean
     *                     example: true
     *                   allowUnit:
     *                     type: boolean
     *                     example: false
     */
    async findAll() {
        try {
            return await FieldType.findAll();
        } catch (error) {
            throw new Error('Erreur lors de la récupération des types de champs');
        }
    }

    /**
     * @swagger
     * /service/fieldTypes/{id}:
     *   get:
     *     summary: Récupérer un type de champ par ID
     *     tags: [FieldTypeService]
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *           example: 1
     *         description: ID unique du type de champ.
     *     responses:
     *       200:
     *         description: Type de champ trouvé avec succès.
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
     *                   example: "Texte"
     *                 separation:
     *                   type: string
     *                   example: ","
     *                 allowFloat:
     *                   type: boolean
     *                   example: true
     *                 allowCharacters:
     *                   type: boolean
     *                   example: true
     *                 allowUnit:
     *                   type: boolean
     *                   example: false
     *       404:
     *         description: Type de champ introuvable.
     */
    async findOne(id) {
        try {
            const fieldType = await FieldType.findByPk(id);
            if (!fieldType) {
                throw new Error('Type de champ non trouvé');
            }
            return fieldType;
        } catch (error) {
            throw new Error('Erreur lors de la récupération du type de champ');
        }
    }

    /**
     * @swagger
     * /service/fieldTypes/add:
     *   post:
     *     summary: Créer un nouveau type de champ
     *     tags: [FieldTypeService]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *                 example: "Texte"
     *               separation:
     *                 type: string
     *                 example: ","
     *               allowFloat:
     *                 type: boolean
     *                 example: true
     *               allowCharacters:
     *                 type: boolean
     *                 example: true
     *               allowUnit:
     *                 type: boolean
     *                 example: false
     *     responses:
     *       201:
     *         description: Type de champ créé avec succès.
     *       400:
     *         description: Requête invalide.
     */
    async create(data) {
        try {
            return await FieldType.create(data);
        } catch (error) {
            throw new Error('Erreur lors de la création du type de champ');
        }
    }

    /**
     * @swagger
     * /service/fieldTypes/{id}:
     *   put:
     *     summary: Mettre à jour un type de champ par ID
     *     tags: [FieldTypeService]
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *           example: 1
     *         description: ID unique du type de champ.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *                 example: "Texte Modifié"
     *               separation:
     *                 type: string
     *                 example: ";"
     *               allowFloat:
     *                 type: boolean
     *                 example: false
     *               allowCharacters:
     *                 type: boolean
     *                 example: false
     *               allowUnit:
     *                 type: boolean
     *                 example: true
     *     responses:
     *       200:
     *         description: Type de champ mis à jour avec succès.
     *       404:
     *         description: Type de champ introuvable.
     */
    async update(id, updateData) {
        try {
            const fieldType = await FieldType.findOne({ where: { id } });
            if (!fieldType) {
                throw new Error('Type de champ non trouvé');
            }
            return await fieldType.update(updateData);
        } catch (error) {
            throw new Error('Erreur lors de la mise à jour du type de champ');
        }
    }

    /**
     * @swagger
     * /service/fieldTypes/{id}:
     *   delete:
     *     summary: Supprimer un type de champ par ID
     *     tags: [FieldTypeService]
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *           example: 1
     *         description: ID unique du type de champ.
     *     responses:
     *       200:
     *         description: Type de champ supprimé avec succès.
     *       404:
     *         description: Type de champ introuvable.
     */
    async delete(id) {
        try {
            const fieldType = await FieldType.findOne({ where: { id } });
            if (!fieldType) {
                throw new Error('Type de champ non trouvé');
            }
            await fieldType.destroy();
            return { message: 'Type de champ supprimé avec succès' };
        } catch (error) {
            throw new Error('Erreur lors de la suppression du type de champ');
        }
    }
}

module.exports = new FieldTypeService();
