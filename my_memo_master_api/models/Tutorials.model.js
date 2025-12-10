const { DataTypes, Op } = require("sequelize");

/**
 * Modèle Tutorials
 * - Clef primaire: id
 * - Clef étrangère: idSubject -> Subject.subjectId
 * - Validations: name non vide, link doit être une URL
 * - Indexes sur name et idSubject pour accélérer recherche/filtrage
 * - Scopes utiles: search (par nom), bySubject, revisionTips
 * - Timestamps gérés manuellement (cohérence avec les autres modèles du projet)
 */
module.exports = (instance) => {
  const Tutorials = instance.define(
    "Tutorials",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Le nom du tutoriel ne peut pas être vide" },
          len: { args: [1, 255], msg: "Le nom est trop long" },
        },
      },
      link: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Le lien du tutoriel ne peut pas être vide" },
          isUrl: { msg: "Le lien doit être une URL valide" },
        },
      },
      revision_tips: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      idSubject: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Subject",
          key: "subjectId",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "Tutorials",
      updatedAt: "updatedAt",
      createdAt: "createdAt",
      timestamps: false,
      // Scopes utiles pour recherche / filtres
      defaultScope: {
        attributes: { exclude: [] },
      },
      scopes: {
        search: (term) => ({
          where: {
            name: { [Op.like]: `%${term}%` },
          },
        }),
        bySubject: (subjectId) => ({ where: { idSubject: subjectId } }),
        revisionTips: (flag = true) => ({ where: { revision_tips: flag } }),
      },
      indexes: [
        { fields: ["name"] },
        { fields: ["idSubject"] },
      ],
    }
  );

  // Association: un tutoriel appartient à un Subject
  Tutorials.associate = (models) => {
    if (models && models.Subject) {
      Tutorials.belongsTo(models.Subject, {
        foreignKey: "idSubject",
        targetKey: "subjectId",
        as: "subject",
      });
    }
  };

  return Tutorials;
};
