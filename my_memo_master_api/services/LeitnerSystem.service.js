const { LeitnerSystem } = require("../models/index");
const { Op } = require("sequelize");

/**
 * @swagger
 * tags:
 *   name: LeitnerSystemService
 *   description: Gestion des systèmes de Leitner via le service
 */
class LeitnerSystemService {
  /**
   * @swagger
   * /service/leitnersystems/all:
   *   get:
   *     summary: Récupérer tous les systèmes de Leitner
   *     tags: [LeitnerSystemService]
   *     responses:
   *       200:
   *         description: Liste de tous les systèmes de Leitner récupérée avec succès.
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
   */
  async findAll() {
    return await LeitnerSystem.findAll();
  }

  /**
   * @swagger
   * /service/leitnersystems/bySubjects/{subjectid}:
   *   get:
   *     summary: Récupérer les systèmes de Leitner liés à un sujet
   *     tags: [LeitnerSystemService]
   *     parameters:
   *       - name: subjectid
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *           example: 1
   *         description: ID unique du sujet.
   *     responses:
   *       200:
   *         description: Liste des systèmes récupérée avec succès.
   *       404:
   *         description: Aucun système trouvé pour ce sujet.
   */
  async findBySubject(subjectId) {
    return await LeitnerSystem.findAll({
      where: { idMindMap: subjectId },
    });
  }

  /**
   * @swagger
   * /service/leitnersystems/{id}:
   *   get:
   *     summary: Récupérer un système de Leitner par ID
   *     tags: [LeitnerSystemService]
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *           example: 1
   *         description: ID unique du système de Leitner.
   *     responses:
   *       200:
   *         description: Système trouvé avec succès.
   *       404:
   *         description: Système introuvable.
   */
  async findOne(id) {
    return await LeitnerSystem.findByPk(id);
  }

  /**
   * @swagger
   * /service/leitnersystems/add:
   *   post:
   *     summary: Créer un nouveau système de Leitner
   *     tags: [LeitnerSystemService]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Système Leitner Science"
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
   *         description: Système créé avec succès.
   *       400:
   *         description: Requête invalide.
   */
  async create(data) {
    return await LeitnerSystem.create(data);
  }

  /**
   * @swagger
   * /service/leitnersystems/edit:
   *   post:
   *     summary: Modifier un système de Leitner existant
   *     tags: [LeitnerSystemService]
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
   *                 example: "Système mis à jour"
   *               idMindMap:
   *                 type: integer
   *                 nullable: true
   *     responses:
   *       200:
   *         description: Système modifié avec succès.
   *       403:
   *         description: Modification refusée.
   */
  async update(data) {
    const { idSystem, idUser, ...updates } = data;
    const system = await LeitnerSystem.findByPk(idSystem);
    if (system && system.idUser === idUser) {
      await system.update(updates);
      return true;
    }
    return false;
  }

  /**
   * @swagger
   * /service/leitnersystems/delete/{id}:
   *   delete:
   *     summary: Supprimer un système de Leitner
   *     tags: [LeitnerSystemService]
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *           example: 1
   *         description: ID du système à supprimer.
   *       - name: idUser
   *         in: query
   *         required: true
   *         schema:
   *           type: integer
   *           example: 2
   *         description: ID de l'utilisateur effectuant la suppression.
   *     responses:
   *       200:
   *         description: Système supprimé avec succès.
   *       403:
   *         description: Accès refusé.
   */
  async delete(id, idUser) {
    const system = await LeitnerSystem.findByPk(id);
    if (system && system.idUser === idUser) {
      await system.destroy();
      return true;
    }
    return false;
  }
}

module.exports = new LeitnerSystemService();
