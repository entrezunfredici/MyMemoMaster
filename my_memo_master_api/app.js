const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // .env is placed in the root directory of the project
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const bodyParser = require('body-parser');
const PORT = process.env.API_PORT || 8000;

const app = express();

// CORS
app.use(cors({
    origin: process.env.VITE_FRONT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

// Options pour SwaggerJsdoc
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Documentation',
            version: '1.0.0',
            description: 'Documentation de l\'API avec OpenAPI et Swagger',
        },
        servers: [
            {
                url:'http://localhost:'+PORT, // URL de ton serveur
            },
        ],
    },
    apis: ['./routers/*.js'], // Chemin des fichiers de routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware pour servir la documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/roles', require('./routers/roles'))

// Si rien n'est trouvé
app.use(({ res }) => {
    return res.status(404).json({ message: 'Route not found' });
})

// ... Autres middlewares
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
