const multer = require('multer');
const logger = require('../helpers/logger');

// eslint-disable-next-line no-unused-vars -- 4 params requis par Express pour les error handlers
module.exports = (err, req, res, _next) => {
    logger.error(`${req.method} ${req.path} — ${err.message || err}`);

    if (err instanceof multer.MulterError || err?.isFileFilterError) {
        return res.status(400).json({ message: err.message });
    }

    const status = err.status || err.statusCode || 500;
    const isProd = process.env.NODE_ENV === 'production';
    res.status(status).json({ message: isProd ? 'Erreur interne du serveur.' : (err.message || 'Erreur interne du serveur.') });
};
