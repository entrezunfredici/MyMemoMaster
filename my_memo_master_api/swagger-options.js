module.exports = swaggerOptions = {
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
    apis: ['./routes/*.js'], // Chemin des fichiers de routes

}

module.exports = swaggerOptions;
