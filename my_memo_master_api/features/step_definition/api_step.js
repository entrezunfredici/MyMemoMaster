const { Given, When, Then, Before } = require('@cucumber/cucumber');
const request = require('supertest');
const app = require('../../app'); // Ensure this path points to your main Express.js file
const db = require('../../models'); // Ensure this path points to your database models
const bcrypt = require('bcrypt'); // Ensure bcrypt is imported for hashing passwords

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
  // You can add checks here if necessary
});

Given('I have a valid authentication token', async function () {
  const { expect } = await import('chai');
  return request(app)
    .post('/users/login')
    .send({ email: 'test@example.com', password: 'password123' })
    .then(response => {
      authToken = response.body.token;
      console.log('Obtained Token:', authToken); // Add this log
      expect(authToken).to.be.a('string'); // Ensure token is set
    })
    .catch(error => {
      console.error('Error obtaining token:', error); // Add this log
      throw error;
    });
});

When('I send a GET request to {string}', function (endpoint) {
  console.log('Authorization Header:', `Bearer ${authToken}`); // Add this log
  return request(app)
    .get(endpoint)
    .set('Authorization', `Bearer ${authToken}`)
    .then(response => {
      this.response = response;
    })
    .catch(error => {
      console.error('Error sending GET request:', error); // Add this log
      throw error;
    });
});

When('I send a POST request to {string} with the following body:', function (endpoint, body) {
  console.log('Sending POST request to:', endpoint); // Add this log
  console.log('Request body:', body); // Add this log
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
  console.log('Sending PUT request to:', endpoint); // Add this log
  console.log('Request body:', body); // Add this log
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

Then('the response status should be {int}', async function (statusCode) {
  const { expect } = await import('chai');
  console.log('Expected status:', statusCode); // Add this log
  console.log('Actual status:', this.response.status); // Add this log
  expect(this.response.status).to.equal(statusCode);
});

Then('the response status should start with {int}', async function (beginStatusCode) {
  const { expect } = await import('chai');
  console.log('Expected status start:', beginStatusCode);
  console.log('Actual status:', this.response.status);
  expect(this.response.status.toString().startsWith(beginStatusCode.toString())).to.be.true;
});

Then('the response should be a list of {string}', async function (type) {
  const { expect } = await import('chai');
  console.log('Response body:', this.response.body); // Add this log
  expect(this.response.body).to.be.an('array');
  this.response.body.forEach(item => {
    expect(item).to.have.property('id');
    // Add other assertions based on the expected properties of the list items
  });
});

Given('a {string} with ID {int} exists', async function (unitType, unitId) {
  const { expect } = await import('chai');
  try {
    // Assuming you have a model for the unitType in your database
    const UnitModel = db[unitType.charAt(0).toUpperCase() + unitType.slice(1)]; // Convert to PascalCase

    // Fetch the unit from the database
    const unit = await UnitModel.findOne({ where: { id: unitId } });

    // Check that the unit exists
    expect(unit).to.exist;
    expect(unit.id).to.equal(unitId);

    console.log(`${unitType} with ID ${unitId} exists:`, unit);
  } catch (error) {
    console.error(`Error checking existence of ${unitType} with ID ${unitId}:`, error);
    throw error;
  }
});

Then('the response should be a message indicating that the {string} was successfully deleted', async function (type) {
  const { expect } = await import('chai');
  // Assuming the response body contains a message field
  console.log('Response body:', this.response.body); // Add this log
  expect(this.response.body.message).to.equal(`${type} successfully deleted`);
});

Then('the response should indicate success', async function () {
  const { expect } = await import('chai');
  console.log('Response body:', this.response.body); // Add this log
  expect(this.response.body.success).to.be.true;
});

Then('the response should be a details of newly added {string}', async function (unitType) {
  const { expect } = await import('chai');
  console.log('Response body:', this.response.body); // Add this log

  // Assuming the response body contains the details of the newly added unit
  const unit = this.response.body;

  // Check that the unit is an object
  expect(unit).to.be.an('object');

  // Check that the unit has the expected properties
  expect(unit).to.have.property('id').that.is.a('number');
  expect(unit).to.have.property('name').that.is.a('string');
  expect(unit).to.have.property('denomination').that.is.a('string');
  expect(unit).to.have.property('physicalQuantityId').that.is.a('number');

  // Add more assertions based on the expected properties of the unit
  // For example, if the unit should have a specific name or description
  // expect(unit.name).to.equal('Expected Name');
  // expect(unit.description).to.equal('Expected Description');

  console.log(`Details of newly added ${unitType}:`, unit);
});

Then('the response should contain the updated details of the {string} with ID {int}', async function (unitType, unitId) {
  const { expect } = await import('chai');
  console.log('Response body:', this.response.body); // Add this log

  // Assuming the response body contains the updated details of the unit
  const unit = this.response.body;

  // Check that the unit is an object
  expect(unit).to.be.an('object');

  // Check that the unit has the correct ID
  expect(unit.id).to.equal(unitId);

  // Check that the unit has the expected properties
  expect(unit).to.have.property('name').that.is.a('string');
  expect(unit).to.have.property('denomination').that.is.a('string');
  expect(unit).to.have.property('updatedAt').that.is.a('string');

  // Add more assertions based on the expected properties of the unit
  // For example, if the unit should have a specific updated name or description
  // expect(unit.name).to.equal('Updated Name');
  // expect(unit.description).to.equal('Updated Description');

  // Optionally, you can add assertions specific to the unitType if needed
  // For example, if unitType is 'product', you might check for product-specific properties
  if (unitType === 'product') {
    expect(unit).to.have.property('price').that.is.a('number');
    expect(unit).to.have.property('category').that.is.a('string');
  }

  // Add more unitType-specific assertions as needed

  console.log(`Updated ${unitType} with ID ${unitId}:`, unit);
});

Then('the response should be an error message indicating that the {string} was not found', async function (unitType) {
  const { expect } = await import('chai');
  console.log('Response body:', this.response.body); // Add this log

  // Assuming the response body contains an error message
  const errorMessage = this.response.body.message || this.response.body.error;

  // Check that the response status indicates an error (e.g., 404 Not Found)
  expect(this.response.status).to.equal(404);

  // Check that the error message indicates the unit was not found
  expect(errorMessage).to.be.a('string');
  expect(errorMessage.toLowerCase()).to.include(`${unitType} not found`);

  console.log(`Error message for ${unitType}:`, errorMessage);
});

Then('the response should be a details of {string} with ID {int}', async function (unitType, unitId) {
  const { expect } = await import('chai');
  console.log('Response body:', this.response.body); // Add this log

  // Assuming the response body contains the details of the unit
  const unit = this.response.body;

  // Check that the unit is an object
  expect(unit).to.be.an('object');

  // Check that the unit has the correct ID
  expect(unit.id).to.equal(unitId);

  // Check that the unit has the expected properties
  expect(unit).to.have.property('name').that.is.a('string');
  expect(unit).to.have.property('denomination').that.is.a('string');
  expect(unit).to.have.property('createdAt').that.is.a('string');
  expect(unit).to.have.property('updatedAt').that.is.a('string');

  // Add more assertions based on the expected properties of the unit
  // For example, if the unit should have a specific name or description
  // expect(unit.name).to.equal('Expected Name');
  // expect(unit.description).to.equal('Expected Description');

  // Optionally, you can add assertions specific to the unitType if needed
  // For example, if unitType is 'product', you might check for product-specific properties
  if (unitType === 'product') {
    expect(unit).to.have.property('price').that.is.a('number');
    expect(unit).to.have.property('category').that.is.a('string');
  }

  // Add more unitType-specific assertions as needed

  console.log(`Details of ${unitType} with ID ${unitId}:`, unit);
});
