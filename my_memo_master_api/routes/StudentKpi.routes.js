// routes/StudentKpi.routes.js
const express = require("express");
const studentKpi = require("../controllers/StudentKpi.controller");
const authMiddleware = require("../middlewares/Auth.middleware");

const router = express.Router();

/**
 * @swagger
 * /student_kpi/summary:
 *   get:
 *     summary: Récupère les KPI agrégés de l'étudiant connecté
 *     tags:
 *       - StudentKpi
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: subjectId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *       - name: startdate
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - name: stopdate
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: KPI agrégés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 masteryAvg:
 *                   type: integer
 *                   example: 62
 *                 masteryDistribution:
 *                   type: object
 *                   example: { "1": 5, "2": 3, "3": 8, "4": 2, "5": 1 }
 *                 sessionsCount:
 *                   type: integer
 *                   example: 19
 *                 timeseries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         example: "2025-01-15"
 *                       count:
 *                         type: integer
 *                         example: 4
 *                       masteryAvg:
 *                         type: integer
 *                         example: 50
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/summary", authMiddleware, studentKpi.getKpi);

/**
 * @swagger
 * /student_kpi/alerts:
 *   get:
 *     summary: Retourne les alertes de régularité de l'étudiant connecté
 *     tags:
 *       - StudentKpi
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: subjectId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des alertes actives
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: INACTIVE
 *                   severity:
 *                     type: string
 *                     enum: [warning, danger]
 *                   message:
 *                     type: string
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/alerts", authMiddleware, studentKpi.getAlerts);

/**
 * @swagger
 * /student_kpi:
 *   get:
 *     summary: Récupère les enregistrements KPI bruts de l'étudiant connecté
 *     tags:
 *       - StudentKpi
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: subjectId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *       - name: startdate
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - name: stopdate
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Liste des enregistrements
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/", authMiddleware, studentKpi.findAll);

/**
 * @swagger
 * /student_kpi:
 *   post:
 *     summary: Crée un enregistrement KPI
 *     tags:
 *       - StudentKpi
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leitnerCardId
 *             properties:
 *               leitnerCardId:
 *                 type: integer
 *                 example: 42
 *               subjectId:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       201:
 *         description: Enregistrement créé
 *       400:
 *         description: Requête invalide
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur interne du serveur
 */
router.post("/", authMiddleware, studentKpi.create);

/**
 * @swagger
 * /student_kpi/{id}:
 *   put:
 *     summary: Met à jour un enregistrement KPI
 *     tags:
 *       - StudentKpi
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subjectId:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Enregistrement mis à jour
 *       404:
 *         description: Non trouvé
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur interne du serveur
 */
router.put("/:id", authMiddleware, studentKpi.update);

/**
 * @swagger
 * /student_kpi/{id}:
 *   delete:
 *     summary: Supprime un enregistrement KPI
 *     tags:
 *       - StudentKpi
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Supprimé
 *       404:
 *         description: Non trouvé
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur interne du serveur
 */
router.delete("/:id", authMiddleware, studentKpi.delete);

module.exports = (app) => {
    /**
     * @swagger
     * tags:
     *   - name: StudentKpi
     *     description: KPI personnels étudiant
     */
    app.use("/student_kpi", router);
};