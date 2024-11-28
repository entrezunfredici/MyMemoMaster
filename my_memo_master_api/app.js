const path = require('path');
const dotenv = require('dotenv')
const express = require('express');
const favicon = require('serve-favicon')
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const subjectRoutes = require("./routes/Subject.routes");
const bodyParser = require('body-parser');

dotenv.config({ path: path.resolve(__dirname, '../.env') }); // .env is placed in the root directory of the project

const app = express();

// CORS
app.use(cors({
    origin: process.env.VITE_FRONT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

// Middleware for favicon
app.use(favicon(__dirname + '/public/favicon.ico'))

// Middleware pour servir la documentation Swagger
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
                url: 'http://localhost:' + process.env.API_PORT, 
            },
        ],
    },
    apis: ['./routers/*.js'], // Chemin des fichiers de routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/roles', require('./routes/Role.route'))
// Si rien n'est trouvé


// ... Autres middlewares
subjectRoutes(app);

app.use(({ res }) => {
    return res.status(404).json({ message: 'Route not found' });
})
module.exports = app;
