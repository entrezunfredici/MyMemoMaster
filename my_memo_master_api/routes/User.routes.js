const express = require("express");
const user = require("../controllers/User.controller.js");

const router = express.Router();

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Inscrire un nouvel utilisateur
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "mathieu"
 *               password:
 *                 type: string
 *                 example: "mypassword123"
 *               email:
 *                 type: string
 *                 example: "mathieu@example.com"
 *     responses:
 *       201:
 *         description: Utilisateur inscrit avec succès.
 *       500:
 *         description: Erreur lors de l'inscription.
 */
router.post("/register", user.register);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Connecter un utilisateur et obtenir un Token JWT
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "mathieu"
 *               password:
 *                 type: string
 *                 example: "mypassword123"
 *     responses:
 *       200:
 *         description: Connexion réussie, JWT généré.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Mot de passe incorrect.
 *       404:
 *         description: Utilisateur introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.post("/login", user.login);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Récupérer un utilisateur par son ID
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur à récupérer
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails de l'utilisateur.
 *       404:
 *         description: Utilisateur non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.get("/:id", user.findOne);

/**
 * @swagger
 * /users/{id}/change-password:
 *   put:
 *     summary: Modifier le mot de passe d'un utilisateur
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Mot de passe modifié avec succès.
 *       404:
 *         description: Utilisateur non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.put("/:id/change-password", user.changePassword);

/**
 * @swagger
 * /users/{id}/role:
 *   post:
 *     summary: Ajouter un rôle à un utilisateur
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleId:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Rôle ajouté avec succès.
 *       500:
 *         description: Erreur lors de l'ajout du rôle.
 */
router.post("/:id/role", user.addRole);

/**
 * @swagger
 * /users/{id}/role:
 *   delete:
 *     summary: Supprimer un rôle d'un utilisateur
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleId:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Rôle supprimé avec succès.
 *       500:
 *         description: Erreur lors de la suppression du rôle.
 */
router.delete("/:id/role", user.removeRole);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur à supprimer
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requesterId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Utilisateur supprimé avec succès.
 *       403:
 *         description: Opération non autorisée.
 *       500:
 *         description: Erreur lors de la suppression.
 */
router.delete("/:id", user.delete);

module.exports = (app) => {
    /**
     * @swagger
     * tags:
     *   - name: Users
     *     description: Gestion des utilisateurs
     */
    app.use("/users", router);
};
