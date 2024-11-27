const subjectService = require("../services/Subject.service.js");

/**
 * @swagger
 * /subjects/all:
 *   get:
 *     summary: Récupérer tous les sujets
 *     tags: [Subjects]
 *     responses:
 *       200:
 *         description: Liste de tous les sujets récupérée avec succès.
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
 *                     example: "Math"
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.findAll = async (req, res) => {
  try {
    const data = await subjectService.findAll();
    res.status(200).send(data);
  } catch (error) {
    res.status(500).send({
      message:
        error.message ||
        "Une erreur s'est produite lors de la récupération des sujets.",
    });
  }
};

/**
 * @swagger
 * /subjects/{id}:
 *   get:
 *     summary: Récupérer un sujet par ID
 *     tags: [Subjects]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Identifiant du sujet
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sujet récupéré avec succès.
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
 *                   example: "Math"
 *       404:
 *         description: Sujet non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.findOne = async (req, res) => {
  try {
    const data = await subjectService.findOne(req.params.id);
    if (!data) {
      res.status(404).send({
        message: `Sujet introuvable pour l'identifiant ${req.params.id}.`,
      });
    } else {
      res.status(200).send(data);
    }
  } catch (error) {
    res.status(500).send({
      message: `Erreur lors de la récupération du sujet avec l'identifiant ${req.params.id}.`,
    });
  }
};

/**
 * @swagger
 * /subjects/add:
 *   post:
 *     summary: Ajouter un nouveau sujet
 *     tags: [Subjects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Math"
 *     responses:
 *       201:
 *         description: Sujet créé avec succès.
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
 *                   example: "Math"
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    const data = await subjectService.create({ name });
    res.status(201).send(data);
  } catch (error) {
    res.status(500).send({
      message: "Une erreur s'est produite lors de la création du sujet.",
    });
  }
};
