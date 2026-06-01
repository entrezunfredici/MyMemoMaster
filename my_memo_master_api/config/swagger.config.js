const composePort = process.env.API_PORT || process.env.PORT || 8080;
const servers = [
    process.env.SWAGGER_SERVER_URL, // override if set
    process.env.API_PUBLIC_URL,     // e.g. http://localhost/api (Traefik)
    process.env.VITE_API_URL,       // front-end base URL
    `http://localhost:${composePort}`, // direct port if exposed
].filter(Boolean).filter((url, index, arr) => arr.indexOf(url) === index).map((url) => ({ url }));

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Documentation',
            version: '1.0.0',
            description: "Documentation de l'API MyMemoMaster avec OpenAPI et Swagger",
        },
        servers,
    },
    apis: ['./routes/*.js'],
};

module.exports = swaggerOptions;
