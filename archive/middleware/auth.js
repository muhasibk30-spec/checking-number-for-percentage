const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    } else {
        token = req.cookies?.perfinted_token;
    }

    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    try {
        req.admin = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

module.exports = { requireAuth };
