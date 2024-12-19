const express = require("express");
const unitController = require("../controllers/Unit.controller");

const router = express.Router();
/**
 * @swagger
 * tags:
 *   name: Units
 *   description: Gestion des unités
 */

/**
 * @swagger
 * /unit/all:
 *   get:
 *     summary: Obtenir toutes les unités
 *     tags: [Units]
 *     responses:
 *       200:
 *         description: Liste de toutes les unités récupérée avec succès.
 *       500:
 *         description: Erreur serveur.
 */
router.get("/unit/all", unitController.getAllUnits);

/**
 * @swagger
 * /unit/{id}:
 *   get:
 *     summary: Obtenir une unité par ID
 *     tags: [Units]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'unité
 *     responses:
 *       200:
 *         description: Unité récupérée avec succès.
 *       404:
 *         description: Unité non trouvée.
 */
router.get("/unit/:id", unitController.getUnitById);

/**
 * @swagger
 * /unit/add:
 *   post:
 *     summary: Ajouter une nouvelle unité
 *     tags: [Units]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Meter"
 *               denomination:
 *                 type: string
 *                 example: "m"
 *               physicalQuantityId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Unité ajoutée avec succès.
 */
router.post("/unit/add", unitController.addUnit);

/**
 * @swagger
 * /unit/{id}:
 *   put:
 *     summary: Mettre à jour une unité
 *     tags: [Units]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'unité
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               denomination:
 *                 type: string
 *     responses:
 *       200:
 *         description: Unité mise à jour avec succès.
 */
router.put("/unit/:id", unitController.updateUnit);

/**
 * @swagger
 * /unit/{id}:
 *   delete:
 *     summary: Supprimer une unité par ID
 *     tags: [Units]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'unité
 *     responses:
 *       200:
 *         description: Unité supprimée avec succès.
 */
router.delete("/unit/:id", unitController.deleteUnit);

module.exports = (app) => {
    /**
     * @swagger
     * tags:
     *   - name: Subjects
     *     description: Gestion des sujets
     */
    app.use("/units", router);
};
