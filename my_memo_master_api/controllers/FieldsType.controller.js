const fieldTypeService = require('../services/FiedsType.service');

/**
 * @swagger
 * /field-types/all:
 *   get:
 *     summary: Récupérer tous les types de champs
 *     tags: [FieldTypes]
 *     responses:
 *       200:
 *         description: Liste de tous les types de champs récupérés avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *       500:
 *         description: Erreur interne du serveur.
 */
const getAllFieldTypes = async (req, res) => {
  try {
    const fieldTypes = await fieldTypeService.getAllFieldTypes();
    res.status(200).json(fieldTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @swagger
 * /field-types/{id}:
 *   get:
 *     summary: Récupérer un type de champ par ID
 *     tags: [FieldTypes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Identifiant du type de champ
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Type de champ récupéré avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *       404:
 *         description: Type de champ non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
const getFieldTypeById = async (req, res) => {
  const { id } = req.params;
  try {
    const fieldType = await fieldTypeService.getFieldTypeById(id);
    if (!fieldType) {
      return res.status(404).json({ message: 'Type de champ non trouvé' });
    }
    res.status(200).json(fieldType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @swagger
 * /field-types/add:
 *   post:
 *     summary: Ajouter un nouveau type de champ
 *     tags: [FieldTypes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               separation:
 *                 type: boolean
 *               allowFloat:
 *                 type: boolean
 *               allowCharacters:
 *                 type: boolean
 *               allowUnit:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Type de champ créé avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 separation:
 *                   type: boolean
 *                 allowFloat:
 *                   type: boolean
 *                 allowCharacters:
 *                   type: boolean
 *                 allowUnit:
 *                   type: boolean
 *       500:
 *         description: Erreur interne du serveur.
 */
const createFieldType = async (req, res) => {
  const { name, separation, allowFloat, allowCharacters, allowUnit } = req.body;
  try {
    const newFieldType = await fieldTypeService.createFieldType({
      name,
      separation,
      allowFloat,
      allowCharacters,
      allowUnit,
    });
    res.status(201).json(newFieldType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @swagger
 * /field-types/{id}:
 *   put:
 *     summary: Mettre à jour un type de champ
 *     tags: [FieldTypes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Identifiant du type de champ à mettre à jour
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               separation:
 *                 type: boolean
 *               allowFloat:
 *                 type: boolean
 *               allowCharacters:
 *                 type: boolean
 *               allowUnit:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Type de champ mis à jour avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *       404:
 *         description: Type de champ non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
const updateFieldType = async (req, res) => {
  const { id } = req.params;
  const { name, separation, allowFloat, allowCharacters, allowUnit } = req.body;

  try {
    const updatedFieldType = await fieldTypeService.updateFieldType(id, {
      name,
      separation,
      allowFloat,
      allowCharacters,
      allowUnit,
    });

    if (!updatedFieldType) {
      return res.status(404).json({ message: 'Type de champ non trouvé' });
    }

    res.status(200).json({ message: 'Type de champ mis à jour avec succès', updatedFieldType });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @swagger
 * /field-types/{id}:
 *   delete:
 *     summary: Supprimer un type de champ
 *     tags: [FieldTypes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Identifiant du type de champ à supprimer
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Type de champ supprimé avec succès.
 *       404:
 *         description: Type de champ non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
const deleteFieldType = async (req, res) => {
  const { id } = req.params;
  try {
    const isDeleted = await fieldTypeService.deleteFieldType(id);

    if (!isDeleted) {
      return res.status(404).json({ message: 'Type de champ non trouvé' });
    }

    res.status(200).json({ message: 'Type de champ supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllFieldTypes,
  getFieldTypeById,
  createFieldType,
  updateFieldType,
  deleteFieldType,
};
