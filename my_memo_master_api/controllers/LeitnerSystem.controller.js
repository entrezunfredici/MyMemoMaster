const leitnerSystemService = require("../services/LeitnerSystem.service.js");

/**
 * @swagger
 * /leitnersystems/all:
 *   get:
 *     summary: Récupérer tous les systèmes de Leitner
 *     tags: [LeitnerSystems]
 *     responses:
 *       200:
 *         description: Liste de tous les systèmes de Leitner récupérée avec succès.
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.findAll = async (req, res) => {
  try {
    const data = await leitnerSystemService.findAll();
    res.status(200).send(data);
  } catch (error) {
    res.status(500).send({
      message:
        "Une erreur s'est produite lors de la récupération des systèmes de Leitner.",
    });
  }
};

/**
 * @swagger
 * /leitnersystems/bySubjects/{subjectid}:
 *   get:
 *     summary: Récupérer les systèmes de Leitner liés à un sujet
 *     tags: [LeitnerSystems]
 *     parameters:
 *       - name: subjectid
 *         in: path
 *         required: true
 *         description: Identifiant du sujet
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des systèmes récupérée avec succès.
 *       404:
 *         description: Aucun système trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.findBySubject = async (req, res) => {
  try {
    const { subjectid } = req.params;
    const data = await leitnerSystemService.findBySubject(subjectid);
    if (!data.length) {
      res.status(404).send({ message: "Aucun système trouvé pour ce sujet." });
    } else {
      res.status(200).send(data);
    }
  } catch (error) {
    res
      .status(500)
      .send({ message: "Erreur serveur lors de la récupération." });
  }
};

/**
 * @swagger
 * /leitnersystems/{id}:
 *   get:
 *     summary: Récupérer un système de Leitner par ID
 *     tags: [LeitnerSystems]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Identifiant du système de Leitner
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Système récupéré avec succès.
 *       404:
 *         description: Système non trouvé.
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await leitnerSystemService.findOne(id);
    if (!data) {
      res.status(404).send({ message: `Système introuvable avec l'ID ${id}` });
    } else {
      res.status(200).send(data);
    }
  } catch (error) {
    res.status(500).send({ message: "Erreur serveur." });
  }
};

/**
 * @swagger
 * /leitnersystem/add:
 *   post:
 *     summary: Ajouter un système de Leitner
 *     tags: [LeitnerSystems]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               idUser:
 *                 type: integer
 *               idMindMap:
 *                 type: integer
 *                 nullable: true
 *               sujet:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Système ajouté avec succès.
 *       500:
 *         description: Erreur interne du serveur.
 */
exports.create = async (req, res) => {
  try {
    const { name, idUser, idMindMap, sujet } = req.body;
    const data = await leitnerSystemService.create({
      name,
      idUser,
      idMindMap,
      sujet,
    });
    res.status(201).send(data);
  } catch (error) {
    res.status(500).send({ message: "Erreur lors de la création du système." });
  }
};

/**
 * @swagger
 * /leitnesystem/edit:
 *   post:
 *     summary: Modifier un système de Leitner
 *     tags: [LeitnerSystems]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idSystem:
 *                 type: integer
 *               idUser:
 *                 type: integer
 *               name:
 *                 type: string
 *               idMindMap:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Système modifié avec succès.
 *       403:
 *         description: Accès refusé.
 *       500:
 *         description: Erreur serveur.
 */
exports.update = async (req, res) => {
  try {
    const { idSystem, idUser, name, idMindMap } = req.body;
    const updated = await leitnerSystemService.update({
      idSystem,
      idUser,
      name,
      idMindMap,
    });
    if (!updated) {
      return res
        .status(403)
        .send({ message: "Accès refusé ou système non modifié." });
    }
    res.status(200).send({ message: "Système modifié avec succès." });
  } catch (error) {
    res.status(500).send({ message: "Erreur lors de la modification." });
  }
};

/**
 * @swagger
 * /leitnersystem/{id}:
 *   delete:
 *     summary: Supprimer un système de Leitner
 *     tags: [LeitnerSystems]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du système de Leitner
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Système supprimé avec succès.
 *       403:
 *         description: Accès refusé.
 *       500:
 *         description: Erreur serveur.
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const { idUser } = req.body;
    const deleted = await leitnerSystemService.delete(id, idUser);
    if (!deleted) {
      return res
        .status(403)
        .send({ message: "Accès refusé ou suppression impossible." });
    }
    res.status(200).send({ message: "Système supprimé avec succès." });
  } catch (error) {
    res.status(500).send({ message: "Erreur serveur lors de la suppression." });
  }
};
