const composePort = process.env.API_PORT || process.env.PORT || 8080
const servers = [
  process.env.SWAGGER_SERVER_URL, // override if set
  process.env.API_PUBLIC_URL, // e.g. http://localhost/api (Traefik)
  process.env.VITE_API_URL, // front-end base URL
  `http://localhost:${composePort}` // direct port if exposed
]
  .filter(Boolean)
  .filter((url, index, arr) => arr.indexOf(url) === index)
  .map((url) => ({ url: `${url}/api/v1` }))

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyMemoMaster API',
      version: '1.0.0',
      description:
        "Documentation complète de l'API MyMemoMaster — révision active, organisation et suivi de progression."
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenu via POST /api/v1/users/login'
        }
      }
    },
    // CHOIX: sécurité globale plutôt que par route
    // RAISON: évite de dupliquer security: [{bearerAuth:[]}] sur chaque route protégée
    security: [{ bearerAuth: [] }]
  },
  apis: ['./routes/*.js']
}

module.exports = swaggerOptions
