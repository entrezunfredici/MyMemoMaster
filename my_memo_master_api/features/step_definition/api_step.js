const { Given, When, Then, Before } = require('@cucumber/cucumber');
const request = require('supertest');
const assert = require('assert');
const app = require('../../app'); // Assurez-vous que ce chemin pointe vers votre fichier principal Express.js
const db = require('../../models'); // Assurez-vous que ce chemin pointe vers vos modèles de base de données
const bcrypt = require('bcrypt'); // Assurez-vous d'importer bcrypt pour hacher les mots de passe

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

When('I send a POST request to {string} with the following body:', function (endpoint, body) {
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
      console.error('Error sending POST request:', error);
      throw error;
    });
});

When('I send a PUT request to {string} with the following body:', function (endpoint, body) {
  console.log('Sending PUT request to:', endpoint); // Ajoutez ce log
  console.log('Request body:', body); // Ajoutez ce log
  return request(app)
    .put(endpoint)
    .set('Authorization', `Bearer ${authToken}`)
    .send(JSON.parse(body))
    .then(response => {
      this.response = response;
    })
    .catch(error => {
      console.error('Error sending PUT request:', error);
      throw error;
    });
});

When('I send a DELETE request to {string}', async function (url) {
  try {
    // Send the DELETE request
    const response = await request(app)
      .delete(url)
      .set('Authorization', `Bearer ${authToken}`);

    // Optionally, you can store the response for later use in other steps
    this.response = response;

    // Return the response status for assertions
    return response.status;
  } catch (error) {
    // Handle the error
    console.error('Error sending DELETE request:', error);
    throw error;
  }
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

Then('the response should be a list of {string}', function (type) {
  console.log('Response body:', this.response.body); // Ajoutez ce log
  assert.ok(Array.isArray(this.response.body), `The response should be a list of ${type}`);
  this.response.body.forEach(item => {
    assert.property(item, 'id', `Each ${type} item should have an 'id' property`);
    // Ajoutez d'autres assertions selon les propriétés attendues des éléments de la liste
  });
});

Then('the response should be a message indicating that the {string} was successfully deleted', function (type) {
  // Assuming the response body contains a message field
  console.log('Response body:', this.response.body); // Ajoutez ce log
  assert.strictEqual(this.response.body.message, `${type} successfully deleted`);
});

Then('the response should indicate success', function () {
  console.log('Response body:', this.response.body); // Ajoutez ce log
  assert.ok(this.response.body.success);
});