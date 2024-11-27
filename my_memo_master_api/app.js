require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const swaggerSpec = require('./config/swagger.config');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const unitRoutes = require('./routes/unit.routes');
app.use('/api', unitRoutes);

app.get('/', (req, res) => {
    res.send('Hello World');
});

module.exports = app;
