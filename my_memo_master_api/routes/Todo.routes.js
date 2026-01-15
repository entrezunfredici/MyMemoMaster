const express = require("express");
const todo = require("../controllers/Todo.controller.js");
const authMiddleware = require("../middlewares/Auth.middleware.js");

const router = express.Router();

/**
 * @swagger
 * /todos:
 *   post:
 *     summary: Créer une nouvelle tâche
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 description: Titre de la tâche
 *               description:
 *                 type: string
 *                 description: Description de la tâche (optionnel)
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 description: Date limite en ISO UTC (optionnel)
 *     responses:
 *       201:
 *         description: Tâche créée avec succès
 *       400:
 *         description: Erreur de validation
 *       401:
 *         description: Non authentifié
 */
router.post("/", authMiddleware.verifyToken, todo.create);

/**
 * @swagger
 * /todos:
 *   get:
 *     summary: Lister les tâches avec filtres et pagination
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Période de filtrage (jour/semaine/mois)
 *       - in: query
 *         name: ref
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date de référence ISO UTC (défaut = maintenant)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Statuts séparés par virgule (défaut = pending,in_progress)
 *         example: "pending,in_progress,done"
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Recherche dans titre et description
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [deadline_asc, deadline_desc, status_asc, created_desc]
 *         description: Tri (défaut = deadline_asc)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Numéro de page (défaut = 1)
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Éléments par page (défaut = 20, max = 100)
 *     responses:
 *       200:
 *         description: Liste des tâches récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                     page:
 *                       type: integer
 *                     page_size:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Non authentifié
 */
router.get("/", authMiddleware.verifyToken, todo.findAll);

/**
 * @swagger
 * /todos/{id}:
 *   get:
 *     summary: Récupérer une tâche par ID
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la tâche
 *     responses:
 *       200:
 *         description: Tâche récupérée avec succès
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Tâche non trouvée
 */
router.get("/:id", authMiddleware.verifyToken, todo.findOne);

/**
 * @swagger
 * /todos/{id}:
 *   put:
 *     summary: Mettre à jour une tâche partiellement
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la tâche
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *               deadline:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, done]
 *     responses:
 *       200:
 *         description: Tâche mise à jour avec succès
 *       400:
 *         description: Erreur de validation
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès interdit (pas propriétaire)
 *       404:
 *         description: Tâche non trouvée
 */
router.put("/:id", authMiddleware.verifyToken, todo.update);

/**
 * @swagger
 * /todos/{id}:
 *   delete:
 *     summary: Supprimer une tâche
 *     tags: [Todos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la tâche
 *     responses:
 *       204:
 *         description: Tâche supprimée avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès interdit (pas propriétaire)
 *       404:
 *         description: Tâche non trouvée
 */
router.delete("/:id", authMiddleware.verifyToken, todo.delete);

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   name: Todos
   *   description: Gestion des tâches (todos)
   * 
   * components:
   *   securitySchemes:
   *     bearerAuth:
   *       type: http
   *       scheme: bearer
   *       bearerFormat: JWT
   */
  app.use("/todos", router);
};
