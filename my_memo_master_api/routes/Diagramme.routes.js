const express = require("express");
const diagramme = require("../controllers/Diagramme.controller.js");
const mindmapImageUpload = require("../middlewares/mindmapImageUpload");
const router = express.Router();

/**
 * @swagger
 * /diagrammes/all:
 *   get:
 *     summary: Récupère tous les diagrammes
 *     tags:
 *       - diagrammes
 *     responses:
 *       200:
 *         description: Liste de tous les diagrammes
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
 *                   mindMapsJson:
 *                     type: string
 *                     example: "json"
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/all", diagramme.findAll);

/**
 * @swagger
 * /diagrammes/{id}:
 *   get:
 *     summary: Récupère un diagramme par son ID
 *     tags:
 *       - diagrammes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du diagramme
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Diagramme correspondant à l'ID
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
 *                 mindMapsJson:
 *                   type: string
 *                   example: "json"
 *       404:
 *         description: Diagramme non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/:id", diagramme.findOne);

/**
 * @swagger
 * /diagrammes/add:
 *   post:
 *     summary: Ajoute un nouveau diagramme
 *     tags:
 *       - diagrammes
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
 *               mindMapJson:
 *                 type: object
 *                 example: {"nodes": [5, 6, 7],"edges": [8, 9, 10]}
 *               userId:
 *                type: integer 
 *                example: 1
 *     responses:
 *       201:
 *         description: Diagramme créé avec succès
 *       400:
 *         description: Requête invalide
 *       500:
 *         description: Erreur interne du serveur
 */
router.post("/add", diagramme.create);

/**
 * @swagger
 * /diagrammes/{id}:
 *   put:
 *     summary: Met à jour un diagramme existant
 *     tags:
 *       - diagrammes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du diagramme à mettre à jour
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
 *                 example: "Updated Diagram Name"
 *               mindMapsJson:
 *                 type: string
 *                 example: "Updated JSON"
 *     responses:
 *       200:
 *         description: Diagramme mis à jour avec succès
 *       404:
 *         description: Diagramme non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.put("/:id", diagramme.update);

/**
 * @swagger
 * /diagrammes/{id}:
 *   delete:
 *     summary: Supprime un diagramme par son ID
 *     tags:
 *       - diagrammes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du diagramme à supprimer
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Diagramme supprimé avec succès
 *       404:
 *         description: Diagramme non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.delete("/:id", diagramme.delete);

/**
 * @swagger
 * /diagrammes/upload-image:
 *   post:
 *     summary: Télécharge une image pour une carte mentale
 *     tags:
 *       - diagrammes
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image à ajouter à la carte mentale
 *     responses:
 *       201:
 *         description: Image uploadée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   example: "http://localhost:8001/uploads/mindmaps/image-123.png"
 *                 path:
 *                   type: string
 *                   example: "/uploads/mindmaps/image-123.png"
 *       400:
 *         description: Requête invalide ou fichier manquant
 *       413:
 *         description: Fichier trop volumineux
 *       500:
 *         description: Erreur interne du serveur
 */
router.post("/upload-image", (req, res) => {
  mindmapImageUpload.single("image")(req, res, (error) => {
    if (error && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "L'image dépasse la taille maximale autorisée de 5 Mo.",
      });
    }
    if (error && error.code === "INVALID_FILE_TYPE") {
      return res.status(400).json({
        message: "Format d'image non supporté. Formats acceptés : JPG, PNG, GIF, WEBP et SVG.",
      });
    }
    if (error) {
      return res.status(500).json({
        message: "Une erreur est survenue lors de l'upload de l'image.",
        error: error.message,
      });
    }

    return diagramme.uploadImage(req, res);
  });
});

module.exports = (app) => {
  /**
   * @swagger
   * tags:
   *   - name: diagrammes
   *     description: Gestion des diagrammes
   */
  app.use("/diagrammes", router);
};
