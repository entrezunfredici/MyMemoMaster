const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const favicon = require("serve-favicon");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const cors = require("cors");
const bodyParser = require("body-parser");
const swaggerSpec = swaggerJsdoc(require("./config/swagger.config.js"));

// Importation des routes
const subjectRoutes = require("./routes/Subject.routes");
const roleRoutes = require("./routes/Role.routes");
const leitnerSystemRoutes = require("./routes/LeitnerSystem.routes.js");
const leitnerCardRoutes = require("./routes/LeitnerCard.routes");
const leitnerBoxRoutes = require("./routes/LeitnerBox.routes");
const responseRoutes = require("./routes/Response.routes");
const userRoutes = require("./routes/User.routes");
const unitRoutes = require("./routes/Unit.routes");
const leitnerSystemsUsersRoutes = require("./routes/LeitnerSystemsUsers.routes");
const diagrammeRoutes = require("./routes/Diagramme.routes");

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

// Body parser
app.use(bodyParser.json());

// Middleware for favicon
app.use(favicon(__dirname + "/public/favicon.ico"));

// Middleware pour servir la documentation Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
subjectRoutes(app);
roleRoutes(app);
responseRoutes(app);
unitRoutes(app);
userRoutes(app);
leitnerSystemRoutes(app);
leitnerCardRoutes(app);
leitnerBoxRoutes(app);
leitnerSystemsUsersRoutes(app);
diagrammeRoutes(app);

// ... Autres middlewares

// Si rien n'est trouvé
app.use(({ res }) => {
  return res.status(404).json({ message: "Route not found" });
});

module.exports = app;
