const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const helmet = require("helmet");
const favicon = require("serve-favicon");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const cors = require("cors");
const bodyParser = require("body-parser");
const swaggerSpec = swaggerJsdoc(require("./config/swagger.config.js"));
const sanitize = require("./middlewares/sanitize.middleware");
const errorHandler = require("./middlewares/errorHandler.middleware");
const { apiLimiter } = require("./middlewares/rateLimit.middleware");

// Importation des routes
const subjectRoutes = require("./routes/Subject.routes");
const roleRoutes = require("./routes/Role.routes");
const testRoutes = require("./routes/Test.routes");
const leitnerSystemRoutes = require("./routes/LeitnerSystem.routes.js");
const leitnerCardRoutes = require("./routes/LeitnerCard.routes");
const leitnerBoxRoutes = require("./routes/LeitnerBox.routes");
const kpiRoutes = require("./routes/Kpi.routes");
const responseRoutes = require("./routes/Response.routes");
const userRoutes = require("./routes/User.routes");
const unitRoutes = require("./routes/Unit.routes");
const leitnerSystemsUsersRoutes = require("./routes/LeitnerSystemsUsers.routes");
const fieldsRoutes = require("./routes/Fields.routes.js");
const fieldsTypeRoutes = require("./routes/FieldsType.routes.js");
const diagrammeRoutes = require("./routes/Diagramme.routes");
const questionRoutes = require("./routes/Question.routes");
const tutorialRoutes = require("./routes/Tutorials.routes");
const gradingRoutes = require("./routes/Grading.routes");
const semanticRoutes = require("./routes/Semantic.routes");
const onboardingStateRoutes = require("./routes/OnboardingState.routes");
const storageRoutes = require("./routes/Storage.routes");
const { startFifoCron } = require('./jobs/fifo.cron');

dotenv.config({ path: path.resolve(__dirname, "../.env") }); // .env is placed in the root directory of the project

const app = express();

// CHOIX: trust proxy activé pour que req.ip reflète le vrai client derrière Traefik
// RAISON: sans ça, tous les clients partagent l'IP de Traefik — rate limiting inefficace en prod
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS — supporte plusieurs origines via CORS_ORIGIN séparé par des virgules
// CHOIX: origin en fonction plutôt qu'en string
// RAISON: cors avec string retourne toujours l'origine configurée sans comparer ;
//         la fonction permet de ne pas poser le header pour les origines inconnues
const CORS_ORIGINS = (process.env.CORS_ORIGIN || process.env.VITE_FRONT_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || CORS_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser
app.use(bodyParser.json({ limit: '10kb' }));

// Sanitize HTML tags from all body string fields
app.use(sanitize);

// Middleware for favicon
app.use(favicon(__dirname + "/public/favicon.ico"));

// Static files for uploaded assets
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// Middleware pour servir la documentation Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes v1
const v1 = express.Router();
v1.use(apiLimiter);
subjectRoutes(v1);
roleRoutes(v1);
testRoutes(v1);
responseRoutes(v1);
unitRoutes(v1);
userRoutes(v1);
kpiRoutes(v1);
leitnerSystemRoutes(v1);
leitnerCardRoutes(v1);
leitnerBoxRoutes(v1);
leitnerSystemsUsersRoutes(v1);
fieldsRoutes(v1);
fieldsTypeRoutes(v1);
diagrammeRoutes(v1);
questionRoutes(v1);
tutorialRoutes(v1);
gradingRoutes(v1);
semanticRoutes(v1);
onboardingStateRoutes(v1);
storageRoutes(v1);
app.use('/api/v1', v1);

// ... Autres middlewares
startFifoCron();

// Si rien n'est trouvé
app.use((_req, res) => {
  return res.status(404).json({ message: "Route introuvable." });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
