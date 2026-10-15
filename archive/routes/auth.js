const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const admin = queryOne('SELECT * FROM admins WHERE username = ?', [username]);
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '8h' });
    res.cookie('perfinted_token', token, {
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000,
        sameSite: 'Lax'
    });
    return res.json({ success: true, username: admin.username });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('perfinted_token');
    return res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    const token = req.cookies?.perfinted_token;
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        return res.json({ id: payload.id, username: payload.username });
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
});

// POST /api/auth/change-password  (inline auth — no circular dep)
router.post('/change-password', (req, res) => {
    // Verify token manually
    const token = req.cookies?.perfinted_token;
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    let adminId;
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        adminId = payload.id;
    } catch {
        return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
    const admin = queryOne('SELECT * FROM admins WHERE id = ?', [adminId]);
    if (!admin || !bcrypt.compareSync(currentPassword, admin.password_hash)) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    run('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, adminId]);
    return res.json({ success: true });
});

// POST /api/auth/reset-password  (forgot password — resets to Khan123 or provided new password)
router.post('/reset-password', (req, res) => {
    const { username, resetKey, newPassword } = req.body;
    // Simple security: require a reset key stored in env, default 'perfinted_reset'
    const RESET_KEY = process.env.RESET_KEY || 'perfinted_reset';
    if (resetKey !== RESET_KEY) {
        return res.status(403).json({ error: 'Invalid reset key.' });
    }
    const admin = queryOne('SELECT * FROM admins WHERE username = ?', [username]);
    if (!admin) {
        return res.status(404).json({ error: 'Admin username not found.' });
    }
    const targetPassword = (newPassword && newPassword.length >= 6) ? newPassword : 'Khan123';
    const hash = bcrypt.hashSync(targetPassword, 10);
    run('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, admin.id]);
    return res.json({ success: true, message: `Password reset to ${targetPassword}. Please change it after login.` });
});

module.exports = router;
