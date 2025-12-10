const db = require("../models");
const Tutorials = db.Tutorials;
const Subject = db.Subject;

/**
 * Service pour la gestion des tutoriels
 * Implémente toutes les fonctionnalités demandées :
 * - findAll avec pagination, recherche, filtres (idSubject, revision_tips)
 * - findOne par ID
 * - create
 * - update
 * - delete
 */

class TutorialsService {
  /**
   * Récupérer tous les tutoriels avec pagination et filtres
   * @param {Object} options - Options de recherche
   * @param {number} options.page - Numéro de page (défaut: 1)
   * @param {number} options.perPage - Éléments par page (défaut: 10)
   * @param {string} options.search - Terme de recherche (optionnel)
   * @param {number} options.subjectId - ID du sujet pour filtrer (optionnel)
   * @param {boolean} options.revisionTips - Filtrer par revision_tips (optionnel)
   * @returns {Promise<{data: Array, pagination: Object}>}
   */
  async findAll(options = {}) {
    const {
      page = 1,
      perPage = 10,
      search,
      subjectId,
      revisionTips,
    } = options;

    // Construction de la clause WHERE
    const where = {};

    // Filtre par recherche (nom du tutoriel) - insensible à la casse
    if (search && search.trim() !== "") {
      where.name = db.instance.where(
        db.instance.fn('LOWER', db.instance.col('Tutorials.name')),
        'LIKE',
        `%${search.trim().toLowerCase()}%`
      );
    }

    // Filtre par sujet
    if (subjectId !== undefined && subjectId !== null && subjectId !== "") {
      where.idSubject = parseInt(subjectId, 10);
    }

    // Filtre par revision_tips
    if (revisionTips !== undefined && revisionTips !== null && revisionTips !== "") {
      // Convertir en booléen si c'est une chaîne
      const revisionTipsBool = revisionTips === true || revisionTips === "true";
      where.revision_tips = revisionTipsBool;
    }

    // Calcul pagination
    const limit = parseInt(perPage, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    // Requête avec pagination et filtres
    const { count, rows } = await Tutorials.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        {
          model: Subject,
          as: "subject",
          attributes: ["subjectId", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return {
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        perPage: limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Récupérer un tutoriel par son ID
   * @param {number} id - ID du tutoriel
   * @returns {Promise<Object|null>}
   */
  async findOne(id) {
    const tutorial = await Tutorials.findByPk(id, {
      include: [
        {
          model: Subject,
          as: "subject",
          attributes: ["subjectId", "name"],
        },
      ],
    });

    return tutorial;
  }

  /**
   * Créer un nouveau tutoriel
   * @param {Object} data - Données du tutoriel
   * @param {string} data.name - Nom du tutoriel
   * @param {string} data.link - Lien du tutoriel
   * @param {number} data.idSubject - ID du sujet lié
   * @param {boolean} data.revision_tips - Conseils de révision (défaut: false)
   * @returns {Promise<Object>}
   */
  async create(data) {
    const { name, link, idSubject, revision_tips = false } = data;

    // Validation basique côté service
    if (!name || !link || !idSubject) {
      throw new Error("Les champs name, link et idSubject sont obligatoires");
    }

    // Vérifier que le sujet existe
    const subject = await Subject.findByPk(idSubject);
    if (!subject) {
      throw new Error(`Le sujet avec l'ID ${idSubject} n'existe pas`);
    }

    const tutorial = await Tutorials.create({
      name,
      link,
      idSubject,
      revision_tips,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return tutorial;
  }

  /**
   * Mettre à jour un tutoriel
   * @param {number} id - ID du tutoriel
   * @param {Object} data - Données à mettre à jour (facultatives)
   * @param {string} data.name - Nom du tutoriel
   * @param {string} data.link - Lien du tutoriel
   * @param {number} data.idSubject - ID du sujet lié
   * @param {boolean} data.revision_tips - Conseils de révision
   * @returns {Promise<Object|null>}
   */
  async update(id, data) {
    const tutorial = await Tutorials.findByPk(id);

    if (!tutorial) {
      return null;
    }

    // Si idSubject est fourni, vérifier qu'il existe
    if (data.idSubject !== undefined) {
      const subject = await Subject.findByPk(data.idSubject);
      if (!subject) {
        throw new Error(`Le sujet avec l'ID ${data.idSubject} n'existe pas`);
      }
    }

    // Mettre à jour uniquement les champs fournis
    const fieldsToUpdate = {};
    if (data.name !== undefined) fieldsToUpdate.name = data.name;
    if (data.link !== undefined) fieldsToUpdate.link = data.link;
    if (data.idSubject !== undefined) fieldsToUpdate.idSubject = data.idSubject;
    if (data.revision_tips !== undefined)
      fieldsToUpdate.revision_tips = data.revision_tips;

    fieldsToUpdate.updatedAt = new Date();

    await tutorial.update(fieldsToUpdate);

    return tutorial;
  }

  /**
   * Supprimer un tutoriel
   * @param {number} id - ID du tutoriel à supprimer
   * @returns {Promise<boolean>} - true si supprimé, false si non trouvé
   */
  async delete(id) {
    const tutorial = await Tutorials.findByPk(id);

    if (!tutorial) {
      return false;
    }

    await tutorial.destroy();
    return true;
  }
}

module.exports = new TutorialsService();