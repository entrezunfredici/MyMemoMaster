const { Given, When, Then, Before } = require('@cucumber/cucumber');
const chai = require("chai");
const chaiHttp = require("chai-http");
const app = require("../../../app");
const db = require('../../../models'); // Assurez-vous que ce chemin pointe vers vos modèles de base de données
const bcrypt = require('bcrypt'); // Assurez-vous d'importer bcrypt pour hacher les mots de passe

chai.use(chaiHttp);
const expect = chai.expect;
let authToken;

Before(async function () {
    try {
        const user = await db.User.findOne({ where: { email: 'test@example.com' } });
        if (!user) {
            const hashedPassword = await bcrypt.hash('password123', 10);
            const userData = {
                name: 'testuser',
                email: 'test@example.com',
                password: hashedPassword,
            };
            console.log('Creating user with data:', userData);
            await db.User.create(userData);
        } else {
            console.log('User already exists, skipping creation.');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }

    Given('the API is up and running', function () {
        // Vous pouvez ajouter des vérifications ici si nécessaire
    });

});

