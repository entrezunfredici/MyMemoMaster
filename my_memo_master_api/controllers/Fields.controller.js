const fieldService = require('../services/Field.service');  // Importation du service FieldService

/**
 * @swagger
 * /fields/all:
 *   get:
 *     summary: Récupérer tous les champs
 *     tags: [Fields]
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
 *                     example: "Valeur"
 *                   fieldChar:
 *                     type: string
 *                     example: "A"
 *                   fieldLetter:
 *                     type: string
 *                     example: "B"
 *                   valueSaved:
 *                     type: boolean
 *                     example: true
 *                   idType:
 *                     type: integer
 *                     example: 2
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.getAllFields = async (req, res) => {
  try {
    const fields = await fieldService.getAllFields();
    res.status(200).json(fields);
  } catch (error) {
    console.error('Erreur lors de la récupération des champs :', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

/**
 * @swagger
 * /fields/{id}:
 *   get:
 *     summary: Récupérer un champ par ID
 *     tags: [Fields]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Identifiant du champ
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Champ récupéré avec succès.
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
 *                   example: "Valeur"
 *                 fieldChar:
 *                   type: string
 *                   example: "A"
 *                 fieldLetter:
 *                   type: string
 *                   example: "B"
 *                 valueSaved:
 *                   type: boolean
 *                   example: true
 *                 idType:
 *                   type: integer
 *                   example: 2
 *       404:
 *         description: Champ non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.getFieldById = async (req, res) => {
  const { id } = req.params;
  try {
    const field = await fieldService.getFieldById(id);
    if (!field) {
      res.status(404).json({ message: 'Champ non trouvé' });
    } else {
      res.status(200).json(field);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du champ :', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

/**
 * @swagger
 * /fields/add:
 *   post:
 *     summary: Ajouter un nouveau champ
 *     tags: [Fields]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fieldValue:
 *                 type: string
 *                 example: "Valeur"
 *               fieldChar:
 *                 type: string
 *                 example: "A"
 *               fieldLetter:
 *                 type: string
 *                 example: "B"
 *               valueSaved:
 *                 type: boolean
 *                 example: true
 *               idType:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Champ créé avec succès.
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
 *                   example: "Valeur"
 *                 fieldChar:
 *                   type: string
 *                   example: "A"
 *                 fieldLetter:
 *                   type: string
 *                   example: "B"
 *                 valueSaved:
 *                   type: boolean
 *                   example: true
 *                 idType:
 *                   type: integer
 *                   example: 2
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.createField = async (req, res) => {
  const { fieldValue, fieldChar, fieldLetter, valueSaved, idType } = req.body;
  try {
    const newField = await fieldService.createField({
      fieldValue,
      fieldChar,
      fieldLetter,
      valueSaved,
      idType,
    });
    res.status(201).json(newField);
  } catch (error) {
    console.error('Erreur lors de la création du champ :', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

/**
 * @swagger
 * /fields/{id}:
 *   put:
 *     summary: Mettre à jour un champ par ID
 *     tags: [Fields]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Identifiant du champ
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fieldValue:
 *                 type: string
 *                 example: "Valeur Modifiée"
 *               fieldChar:
 *                 type: string
 *                 example: "B"
 *               fieldLetter:
 *                 type: string
 *                 example: "C"
 *               valueSaved:
 *                 type: boolean
 *                 example: false
 *               idType:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Champ mis à jour avec succès.
 *       404:
 *         description: Champ non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.updateField = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const updatedField = await fieldService.updateField(id, updates);
    if (!updatedField) {
      res.status(404).json({ message: 'Champ non trouvé' });
    } else {
      res.status(200).json(updatedField);
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du champ :', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

/**
 * @swagger
 * /fields/{id}:
 *   delete:
 *     summary: Supprimer un champ par ID
 *     tags: [Fields]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Identifiant du champ
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Champ supprimé avec succès.
 *       404:
 *         description: Champ non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.deleteField = async (req, res) => {
  const { id } = req.params;
  try {
    const isDeleted = await fieldService.deleteField(id);
    if (!isDeleted) {
      res.status(404).json({ message: 'Champ non trouvé' });
    } else {
      res.status(200).json({ message: 'Champ supprimé avec succès' });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du champ :', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};
