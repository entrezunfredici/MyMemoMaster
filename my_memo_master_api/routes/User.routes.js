const express = require("express");
const user = require("../controllers/User.controller.js");
const authMiddleware = require("../middlewares/Auth.middleware.js");

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
 *               name:
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
 *               email:
 *                 type: string
 *                 example: "mathieu@example.com"
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
router.get("/:id", authMiddleware, user.findOne);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Mettre à jour un utilisateur
 *     tags: 
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: "updated_name"
 *               email:
 *                 type: string
 *                 example: "updated_email@example.com"
 *     responses:
 *       200:
 *         description: Utilisateur mis à jour avec succès.
 *       404:
 *         description: Utilisateur non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.put("/:id", authMiddleware, user.update);

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
router.delete("/:id", authMiddleware, user.delete);

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
router.put("/:id/change-password", authMiddleware, user.changePassword);

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
router.post("/:id/role", authMiddleware, user.addRole);

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
router.delete("/:id/role", authMiddleware, user.removeRole);

/**
 * @swagger
 * /users/verify-email:
 *   post:
 *     summary: Vérifier l'email d'un utilisateur
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "mathieu@example.com"
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Email vérifié avec succès.
 *       401:
 *         description: Code invalide.
 *       404:
 *         description: Utilisateur introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.post("/verify-email", user.verifyEmail);

/**
 * @swagger
 * /users/forgot-password:
 *   post:
 *     summary: Envoyer un code de réinitialisation de mot de passe
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "mathieu@example.com"
 *     responses:
 *       201:
 *         description: Code de réinitialisation envoyé avec succès.
 *       404:
 *         description: Utilisateur introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.post("/forgot-password", user.forgotPassword);

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "mathieu@example.com"
 *               code:
 *                 type: string
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 example: "newpassword123"
 *     responses:
 *       201:
 *         description: Mot de passe réinitialisé avec succès.
 *       401:
 *         description: Code invalide.
 *       404:
 *         description: Utilisateur introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.post("/reset-password", user.resetPassword);

/**
 * @swagger
 * /users/{id}/role:
 *   put:
 *     summary: Mettre à jour le rôle d'un utilisateur
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
 *         description: Rôle mis à jour avec succès.
 *       500:
 *         description: Erreur lors de la mise à jour du rôle.
 */
router.put("/:id/role", authMiddleware, user.updateRole);


module.exports = (app) => {
    /**
     * @swagger
     * tags:
     *   - name: Users
     *     description: Gestion des utilisateurs
     */
    app.use("/users", router);
};
