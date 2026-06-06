const rateLimit = require("express-rate-limit");

// CHOIX: skipInTest comme fonction (pas booléen) pour être réévalué à chaque requête
// RAISON: permet de modifier NODE_ENV en cours de test sans recréer le middleware
const skipInTest = () => process.env.NODE_ENV === "test";

/**
 * Limiteur pour les actions d'authentification sensibles.
 * Couvre login, vérification email, mot de passe oublié et réinitialisation.
 * Configurable via AUTH_RATE_MAX et AUTH_RATE_WINDOW_MS.
 *
 * @type {import("express-rate-limit").RateLimitRequestHandler}
 */
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_MAX, 10) || 5,
  skip: skipInTest,
  message: { message: "Trop de tentatives, réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limiteur pour la création de compte.
 * Configurable via REGISTER_RATE_MAX et REGISTER_RATE_WINDOW_MS.
 *
 * @type {import("express-rate-limit").RateLimitRequestHandler}
 */
const registerLimiter = rateLimit({
  windowMs: parseInt(process.env.REGISTER_RATE_WINDOW_MS, 10) || 60 * 60 * 1000,
  max: parseInt(process.env.REGISTER_RATE_MAX, 10) || 10,
  skip: skipInTest,
  message: { message: "Trop de créations de compte, réessayez dans 1 heure." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limiteur global sur l'ensemble des routes API.
 * Protection contre les abus non ciblés (scraping, spam de routes).
 * Configurable via API_RATE_MAX et API_RATE_WINDOW_MS.
 *
 * @type {import("express-rate-limit").RateLimitRequestHandler}
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_MAX, 10) || 200,
  skip: skipInTest,
  message: { message: "Trop de requêtes, réessayez plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, registerLimiter, apiLimiter };
