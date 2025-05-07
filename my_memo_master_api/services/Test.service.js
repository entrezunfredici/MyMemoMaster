const { Test } = require("../models/index");

/**
 * @swagger
 * tags:
 *   name: Tests
 *   description: Gestion des tests
 */
class TestService {
    /**
     * @swagger
     * path:
     *   /service/tests:
     *     get:
     *       summary: Récupérer tous les tests
     *       description: Récupère la liste complète des tests.
     *       tags: [Tests]
     *       responses:
     *         200:
     *           description: Liste des tests
     *           content:
     *             application/json:
     *               schema:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: integer
     *                       example: 1
     *                     name:
     *                       type: string
     *                       example: "Test de connaissance"
     *                     idSubject:
     *                       type: integer
     *                       example: 1
     *         500:
     *           description: Erreur interne du serveur
     */
    async findAll() {
        return await Test.findAll();
    }

    /**
     * @swagger
     * path:
     *   /service/tests/{id}:
     *     get:
     *       summary: Récupérer un test par ID
     *       description: Récupère un test spécifique en fonction de l'ID fourni.
     *       tags: [Tests]
     *       parameters:
     *         - in: path
     *           name: id
     *           required: true
     *           schema:
     *             type: integer
     *           description: ID du test à récupérer.
     *       responses:
     *         200:
     *           description: Détails du test
     *           content:
     *             application/json:
     *               schema:
     *                 type: object
     *                 properties:
     *                   id:
     *                     type: integer
     *                     example: 1
     *                   name:
     *                     type: string
     *                     example: "Test de connaissance"
     *                   idSubject:
     *                     type: integer
     *                     example: 1
     *         404:
     *           description: Test non trouvé
     *         500:
     *           description: Erreur interne du serveur
     */
    async findOne(id) {
        return await Test.findByPk(id);
    }

    /**
     * @swagger
     * path:
     *   /service/tests:
     *     post:
     *       summary: Créer un nouveau test
     *       description: Crée un test avec les données fournies.
     *       tags: [Tests]
     *       requestBody:
     *         required: true
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 name:
     *                   type: string
     *                   example: "Test de connaissance"
     *                 idSubject:
     *                   type: integer
     *                   example: 1
     *       responses:
     *         201:
     *           description: Test créé avec succès
     *           content:
     *             application/json:
     *               schema:
     *                 type: object
     *                 properties:
     *                   id:
     *                     type: integer
     *                     example: 1
     *                   name:
     *                     type: string
     *                     example: "Test de connaissance"
     *                   idSubject:
     *                     type: integer
     *                     example: 1
     *         400:
     *           description: Requête invalide
     *         500:
     *           description: Erreur interne du serveur
     */
    async create(data) {
        return await Test.create(data);
    }

    /**
     * @swagger
     * path:
     *   /service/tests/{id}:
     *     put:
     *       summary: Mettre à jour un test existant
     *       description: Met à jour les informations d'un test existant en fonction de l'ID fourni.
     *       tags: [Tests]
     *       parameters:
     *         - in: path
     *           name: id
     *           required: true
     *           schema:
     *             type: integer
     *           description: ID du test à mettre à jour.
     *       requestBody:
     *         required: true
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 name:
     *                   type: string
     *                   example: "Test de mise à jour"
     *                 idSubject:
     *                   type: integer
     *                   example: 1
     *       responses:
     *         200:
     *           description: Test mis à jour avec succès
     *           content:
     *             application/json:
     *               schema:
     *                 type: object
     *                 properties:
     *                   id:
     *                     type: integer
     *                     example: 1
     *                   name:
     *                     type: string
     *                     example: "Test de mise à jour"
     *                   idSubject:
     *                     type: integer
     *                     example: 1
     *         400:
     *           description: Requête invalide
     *         404:
     *           description: Test non trouvé
     *         500:
     *           description: Erreur interne du serveur
     */
    async update(id, data) {
        const test = await Test.findByPk(id);
        if (!test) {
            throw new Error(" Test not found");
        }
        return await test.update(data);
    }

    /**
     * @swagger
     * path:
     *   /service/tests/{id}:
     *     delete:
     *       summary: Supprimer un test
     *       description: Supprime un test en fonction de l'ID fourni.
     *       tags: [Tests]
     *       parameters:
     *         - in: path
     *           name: id
     *           required: true
     *           schema:
     *             type: integer
     *           description: ID du test à supprimer.
     *       responses:
     *         200:
     *           description: Test supprimé avec succès
     *         404:
     *           description: Test non trouvé
     *         500:
     *           description: Erreur interne du serveur
     */
    async delete(id) {
        const test = await Test.findByPk(id);
        if (!test) {
            throw new Error("Test not found");
        }
        return await test.destroy();
    }
}

module.exports = new TestService();