const logger = require('../helpers/logger');

// eslint-disable-next-line no-unused-vars -- 4 params requis par Express pour les error handlers
module.exports = (err, req, res, _next) => {
    logger.error(`${req.method} ${req.path} — ${err.message || err}`);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Erreur interne du serveur.' });
};
