const { FieldType } = require('../models/index');  // Importation du modèle FieldType

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
     * Méthode pour appliquer les règles du champ
     * @param {Object} field Le champ à traiter
     * @returns {Object} Valeur traitée du champ
     */
    async processField(field) {
        try {
            const fieldType = await this.findOne(field.idType); // On récupère le type du champ
            
            // Si le type de champ permet les valeurs numériques
            let result = {};
            if (fieldType.allowFloat) {
                result.numericValue = field.numericValue; // Retourne la valeur numérique
            }

            // Si le type de champ permet les valeurs textuelles
            if (fieldType.allowCharacters) {
                result.textValue = field.textValue; // Retourne la valeur textuelle
            }

            // Si le type de champ permet les unités
            if (fieldType.allowUnit) {
                result.unit = field.unit; // Retourne l'unité du champ
            }

            // Appliquer la règle de séparation si elle est définie
            if (fieldType.separation) {
                result = this.applySeparationRule(result, fieldType.separation);
            }

            return result;

        } catch (error) {
            throw new Error('Erreur lors du traitement du champ');
        }
    }

    /**
     * Appliquer la règle de séparation sur les valeurs du champ
     * @param {Object} fieldData Données du champ
     * @param {string} separation La règle de séparation
     * @returns {Object} Valeurs formatées avec séparation
     */
    applySeparationRule(fieldData, separation) {
        const separationRegex = /([A-Z])(\d+)/g; // Regex pour extraire la règle de séparation (ex : T3, N2)
        let result = {};

        // Appliquer la règle de séparation pour chaque champ
        for (const [key, value] of Object.entries(fieldData)) {
            if (separationRegex.test(separation)) {
                const matches = [...separation.matchAll(separationRegex)];
                matches.forEach(([_, type, length]) => {
                    if (key.startsWith(type)) {
                        result[key] = this.applySeparation(value, parseInt(length, 10));
                    }
                });
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }

    /**
     * Appliquer la séparation à une valeur
     * @param {string|number} value La valeur à séparer
     * @param {number} length Le nombre de caractères/digits pour chaque segment
     * @returns {Object} Valeur séparée sous forme d'objet
     */
    applySeparation(value, length) {
        const valueStr = value.toString();
        let segments = [];
        for (let i = 0; i < valueStr.length; i += length) {
            segments.push(valueStr.slice(i, i + length));
        }
        return segments;
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