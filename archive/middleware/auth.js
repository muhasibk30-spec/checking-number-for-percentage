const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function requireAuth(req, res, next) {
    const token = req.cookies?.perfinted_token;
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    try {
        req.admin = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

module.exports = { requireAuth };
