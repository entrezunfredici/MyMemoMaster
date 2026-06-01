const HTML_TAG_RE = /<[^>]*>/g;

function sanitizeValue(value) {
    if (typeof value === 'string') return value.trim().replace(HTML_TAG_RE, '');
    if (Array.isArray(value)) return value.map(sanitizeValue);
    if (value && typeof value === 'object') return sanitizeObject(value);
    return value;
}

function sanitizeObject(obj) {
    const result = {};
    for (const key of Object.keys(obj)) {
        result[key] = sanitizeValue(obj[key]);
    }
    return result;
}

module.exports = (req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
};
