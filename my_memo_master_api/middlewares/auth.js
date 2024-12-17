const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
    if (process.env.BACK_BYPASS_AUTH == 'true') {
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
        const decoded = jwt.verify(token, process.env.BACK_TOKEN_SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).send({ message: 'Invalid token!' });
        return;
    }
};