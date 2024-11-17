require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const PORT = process.env.PORT || 8000;

const app = express();

app.use(cors());
app.use(express.json());

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

// Route pour la racine
app.get('/', (req, res) => {
    res.send('Hello World');
});

// ... Autres middlewares
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
