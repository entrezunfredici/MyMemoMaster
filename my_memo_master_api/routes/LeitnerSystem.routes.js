const express = require("express");
const leitnerSystem = require("../controllers/LeitnerSystem.controller.js");

const router = express.Router();

/**
 * @swagger
 * /leitnersystems/all:
 *   get:
 *     summary: Récupère tous les systèmes de Leitner
 *     tags:
 *       - LeitnerSystems
 *     responses:
 *       200:
 *         description: Liste de tous les systèmes de Leitner
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   idSystem:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: "Système Leitner Maths"
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/all", leitnerSystem.findAll);

/**
 * @swagger
 * /leitnersystems/bySubjects/{subjectid}:
 *   get:
 *     summary: Récupère les systèmes de Leitner liés à un sujet
 *     tags:
 *       - LeitnerSystems
 *     parameters:
 *       - name: subjectid
 *         in: path
 *         required: true
 *         description: ID du sujet lié
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des systèmes de Leitner liés au sujet
 *       404:
 *         description: Aucun système trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/bySubjects/:subjectid", leitnerSystem.findBySubject);

/**
 * @swagger
 * /leitnersystems/{id}:
 *   get:
 *     summary: Récupère un système de Leitner par son ID
 *     tags:
 *       - LeitnerSystems
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du système de Leitner
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails du système de Leitner
 *       404:
 *         description: Système non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/:id", leitnerSystem.findOne);

/**
 * @swagger
 * /leitnersystem/add:
 *   post:
 *     summary: Ajoute un nouveau système de Leitner
 *     tags:
 *       - LeitnerSystems
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Système Leitner Physique"
 *               idUser:
 *                 type: integer
 *                 example: 2
 *               idMindMap:
 *                 type: integer
 *                 nullable: true
 *                 example: 5
 *               sujet:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: "Chapitre 1"
 *     responses:
 *       201:
 *         description: Système créé avec succès
 *       500:
 *         description: Erreur interne du serveur
 */
router.post("/add", leitnerSystem.create);

/**
 * @swagger
 * /leitnesystem/edit:
 *   post:
 *     summary: Modifie un système de Leitner existant
 *     tags:
 *       - LeitnerSystems
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idSystem:
 *                 type: integer
 *                 example: 1
 *               idUser:
 *                 type: integer
 *                 example: 2
 *               name:
 *                 type: string
 *                 example: "Système Leitner mis à jour"
 *               idMindMap:
 *                 type: integer
 *                 nullable: true
 *                 example: 3
 *     responses:
 *       200:
 *         description: Système modifié avec succès
 *       403:
 *         description: Accès refusé
 *       500:
 *         description: Erreur serveur
 */
router.post("/edit", leitnerSystem.update);

/**
 * @swagger
 * /leitnersystems/share:
 *   post:
 *     summary: Partager un système de Leitner avec un utilisateur
 *     tags: [LeitnerSystems]
 *     description: Permet à un utilisateur propriétaire d'un système de Leitner de le partager avec un autre utilisateur en attribuant des droits spécifiques.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idUserOwner:
 *                 type: integer
 *                 description: ID de l'utilisateur propriétaire qui partage le système.
 *                 example: 1
 *               idUserShared:
 *                 type: integer
 *                 description: ID de l'utilisateur à qui le système est partagé.
 *                 example: 2
 *               idSystem:
 *                 type: integer
 *                 description: ID du système de Leitner à partager.
 *                 example: 10
 *               writeRight:
 *                 type: boolean
 *                 description: Droit d'écriture (true ou false).
 *                 example: true
 *               shareRight:
 *                 type: boolean
 *                 description: Droit de partage (true ou false).
 *                 example: true
 *               shareWithWriteRightRight:
 *                 type: boolean
 *                 description: Droit de partager avec écriture (true ou false).
 *                 example: false
 *               shareWithAllRights:
 *                 type: boolean
 *                 description: Droit de partager avec tous les droits (true ou false).
 *                 example: false
 *     responses:
 *       200:
 *         description: Système partagé avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Système partagé avec succès."
 *       403:
 *         description: Permission refusée.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vous n'avez pas les droits pour partager ce système."
 *       500:
 *         description: Erreur interne du serveur.
 */
router.post("/share", leitnerSystem.share);

/**
 * @swagger
 * /leitnersystem/{id}:
 *   delete:
 *     summary: Supprime un système de Leitner
 *     tags:
 *       - LeitnerSystems
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du système de Leitner à supprimer
 *         schema:
 *           type: integer
 *       - name: idUser
 *         in: query
 *         required: true
 *         description: ID de l'utilisateur effectuant la suppression
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Système supprimé avec succès
 *       403:
 *         description: Accès refusé
 *       500:
 *         description: Erreur serveur
 */
router.delete("/:id", leitnerSystem.delete);

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: LeitnerSystems
   *     description: Gestion des systèmes de Leitner
   */
  app.use("/leitnersystems", router);
};
