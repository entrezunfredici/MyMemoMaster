const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const favicon = require("serve-favicon");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const cors = require("cors");
const subjectRoutes = require("./routes/Subject.routes");
const roleRoutes = require("./routes/Role.routes");
const bodyParser = require("body-parser");
const leitnerSystemRoutes = require("./routes/LeitnerSystem.routes.js");
const LeitnernerCardRoutes = require("./routes/LeitnerCard.routes");
const LeitnerBoxRoutes = require("./routes/LeitnerBox.routes");

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
const swaggerSpec = swaggerJsdoc(require("./swagger.config.js"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
subjectRoutes(app);
roleRoutes(app);
leitnerSystemRoutes(app);
LeitnernerCardRoutes(app);
LeitnerBoxRoutes(app);
// ... Autres middlewares

// Si rien n'est trouvé
app.use(({ res }) => {
  return res.status(404).json({ message: "Route not found" });
});
module.exports = app;
