const { DataTypes } = require("sequelize");

module.exports = (instance) => {
    const Test =  instance.define(
        'Test',
        {
        testId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
        },
        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Subject', // nom du modèle référencé
                key: 'subjectId'
            },
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
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
    },{
        tableName: 'Test',
        updatedAt: 'updatedAt',
        createdAt: 'createdAt',
        timestamps: true,
    }
    );

    Test.associate = (models) => {

        Test.belongsToMany(models.Question, {
            through: "testQuestions",
            foreignKey: "idTest",
            otherKey: "idQuestion",
            as: "question",
        });

        Test.belongsTo(models.Subject, {
            foreignKey: "subjectId",
            as: "subject",
        });
    };

    return Test;
};