const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    if (process.env.API_BYPASS_AUTH == 'true') {
        next();
        return;
    }

    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        res.status(401).send({ message: 'No header provided!' });
        return;
    }

    const token = authHeader.split(' ')[1] || authHeader || null; // * authHeader as 'Bearer <token>'

    if (!token) {
        res.status(401).send({ message: 'No token provided!' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.AUTH_JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error(error?.message || error);
        res.status(401).send({ message: 'Unauthorized!' });
        return;
    }
};