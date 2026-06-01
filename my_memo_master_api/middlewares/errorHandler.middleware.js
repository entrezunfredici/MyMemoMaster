const logger = require('../helpers/logger');

module.exports = (err, req, res, _next) => {
    logger.error(`${req.method} ${req.path} — ${err.message || err}`);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Erreur interne du serveur.' });
};
