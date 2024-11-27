const fieldsType = require("../models/FiedsType");
const fieldsType = require("../models/FiedsType");

const fieldsTypeService = {
  /**
   * Obtenir tous les types de champs
   * @returns {Promise<Array>} Liste de tous les types de champs
   */
  getAllFieldsTypes: async () => {
    try {
      const fieldsTypes = await fieldsType.findAll();
      return fieldsTypes;
    } catch (error) {
      throw new Error(
        "Erreur lors de la récupération des types de champs : " + error.message
      );
    }
  },
  /**
   * Obtenir un type de champ par ID
   * @param {number} id - ID du type de champ
   * @returns {Promise<Object>} Type de champ correspondant
   */
  getFieldTypeById: async (id) => {
    try {
      const fieldsTypeId = await fieldsType.findByPk(id); // Recherche par clé primaire
      if (!fieldsTypeId) {
        throw new Error(`Type de champ avec l'ID ${id} non trouvé.`);
      }
      return fieldsTypeId;
    } catch (error) {
      throw new Error(
        "Erreur lors de la récupération du type de champ : " + error.message
      );
    }
  },
  /**
   * Ajouter un nouveau type de champ
   * @param {Object} data - Données du nouveau type de champ
   * @returns {Promise<Object>} Nouveau type de champ créé
   */

  createFieldType: async (data) => {
    try {
      const newFieldType = await fieldsType.create(data); // Création d'une nouvelle entrée
      return newFieldType;
    } catch (error) {
      throw new Error(
        "Erreur lors de la création du type de champ : " + error.message
      );
    }
  },

  /**
   * Mettre à jour un type de champ par ID
   * @param {number} id - ID du type de champ à mettre à jour
   * @param {Object} data - Données à mettre à jour
   * @returns {Promise<Object>} Type de champ mis à jour
   */

  updateFieldType: async (id, data) => {
    try {
      const fieldsTypeUpDate = await fieldsType.findByPk(id);
      if (!fieldsTypeUpDate) {
        throw new Error(`Type de champ avec l'ID ${id} non trouvé.`);
      }
      await fieldsTypeUpDate.update(data); // Met à jour les données
      return fieldsTypeUpDate;
    } catch (error) {
      throw new Error(
        "Erreur lors de la mise à jour du type de champ : " + error.message
      );
    }
  },

   /**
   * Supprimer un type de champ par ID
   * @param {number} id - ID du type de champ à supprimer
   * @returns {Promise<void>}
   */

//   ....



};
