const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const favicon = require("serve-favicon");
const swaggerUi = require("swagger-ui-express");
const cors = require("cors");
const subjectRoutes = require("./routes/Subject.routes");
const roleRoutes = require("./routes/Role.routes");
const responseRoutes = require("./routes/Response.routes");
const userRoutes = require("./routes/User.routes");
const unitRoutes = require("./routes/Unit.routes");
const diagrammeRoutes = require("./routes/Diagramme.routes.js");
const bodyParser = require('body-parser');
const swaggerJsdoc = require('swagger-jsdoc');

dotenv.config({ path: path.resolve(__dirname, "../.env") }); // .env is placed in the root directory of the project

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.VITE_FRONT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.json());

// Middleware for favicon
app.use(favicon(__dirname + "/public/favicon.ico"));

// Middleware pour servir la documentation Swagger
const swaggerSpec = swaggerJsdoc(require("./config/swagger.config.js"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
subjectRoutes(app);
roleRoutes(app);
responseRoutes(app);
unitRoutes(app);
userRoutes(app);
diagrammeRoutes(app);


// ... Autres middlewares

// Si rien n'est trouvé
app.use(({ res }) => {
  return res.status(404).json({ message: "Route not found" });
});

module.exports = app;
