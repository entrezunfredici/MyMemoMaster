const { Given, When, Then, Before } = require('@cucumber/cucumber');
const request = require('supertest');
const assert = require('assert');
const app = require('../../app'); // Assurez-vous que ce chemin pointe vers votre fichier principal Express.js
const db = require('../../models'); // Assurez-vous que ce chemin pointe vers vos modèles de base de données
const bcrypt = require('bcrypt'); // Assurez-vous d'importer bcrypt pour hacher les mots de passe

let authToken;

// Hook pour créer un utilisateur avant les tests
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
});

Given('the API is up and running', function () {
  // Vous pouvez ajouter des vérifications ici si nécessaire
});

Given('I have a valid authentication token', function () {
  return request(app)
    .post('/users/login')
    .send({ email: 'test@example.com', password: 'password123' })
    .then(response => {
      authToken = response.body.token;
      console.log('Obtained Token:', authToken); // Ajoutez ce log
    })
    .catch(error => {
      console.error('Error obtaining token:', error); // Ajoutez ce log
      throw error;
    });
});

When('I send a GET request to {string}', function (endpoint) {
  console.log('Authorization Header:', `Bearer ${authToken}`); // Ajoutez ce log
  return request(app)
    .get(endpoint)
    .set('Authorization', `Bearer ${authToken}`)
    .then(response => {
      this.response = response;
    })
    .catch(error => {
      console.error('Error sending GET request:', error); // Ajoutez ce log
      throw error;
    });
});

When('I send a POST request to {string} with body:', function (endpoint, body) {
  console.log('Sending POST request to:', endpoint); // Ajoutez ce log
  console.log('Request body:', body); // Ajoutez ce log
  return request(app)
    .post(endpoint)
    .set('Authorization', `Bearer ${authToken}`)
    .send(JSON.parse(body))
    .then(response => {
      this.response = response;
    })
    .catch(error => {
      console.error('Error sending POST request:', error); // Ajoutez ce log
      throw error;
    });
});

Then('the response status should be {int}', function (statusCode) {
  console.log('Expected status:', statusCode); // Ajoutez ce log
  console.log('Actual status:', this.response.status); // Ajoutez ce log
  assert.strictEqual(this.response.status, statusCode);
});

Then('the response status should start with {int}', function (beginStatusCode) {
  console.log('Expected status start:', beginStatusCode);
  console.log('Actual status:', this.response.status);
  assert.strictEqual(this.response.status.toString().startsWith(beginStatusCode.toString()), true);
});

Then('the response should be a list of rights', function () {
  console.log('Response body:', this.response.body); // Ajoutez ce log
  assert.ok(Array.isArray(this.response.body.data));
});

Then('the response should be a list of roles', function () {
  console.log('Response body:', this.response.body); // Ajoutez ce log
  assert.ok(Array.isArray(this.response.body.data));
});

Then('the response should indicate success', function () {
  console.log('Response body:', this.response.body); // Ajoutez ce log
  assert.ok(this.response.body.success);
});
