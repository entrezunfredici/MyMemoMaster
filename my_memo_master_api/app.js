const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const favicon = require("serve-favicon");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const cors = require("cors");
const bodyParser = require("body-parser");

// Importation des routes
const subjectRoutes = require("./routes/Subject.routes");
const roleRoutes = require("./routes/Role.routes");
const leitnerSystemRoutes = require("./routes/LeitnerSystem.routes.js");
const leitnerCardRoutes = require("./routes/LeitnerCard.routes");
const leitnerBoxRoutes = require("./routes/LeitnerBox.routes");

dotenv.config({ path: path.resolve(__dirname, "../.env") }); // .env is placed in the root directory of the project

const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.VITE_FRONT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser
app.use(bodyParser.json());

// Middleware for favicon
app.use(favicon(__dirname + "/public/favicon.ico"));

// Middleware pour servir la documentation Swagger
const swaggerSpec = swaggerJsdoc(require("./swagger.config.js"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/subjects", subjectRoutes);
app.use("/roles", roleRoutes);
app.use("/leitnersystems", leitnerSystemRoutes);
app.use("/leitnercards", leitnerCardRoutes);
app.use("/leitnerboxes", leitnerBoxRoutes);

// Gestion des routes inexistantes
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

module.exports = app;
