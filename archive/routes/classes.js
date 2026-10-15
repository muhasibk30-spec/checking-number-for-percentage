const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../database');
const { requireAuth } = require('../middleware/auth');

// GET /api/classes/subjects — must come before /:id
router.get('/subjects', (req, res) => {
    const subjects = query('SELECT * FROM subjects ORDER BY name');
    res.json(subjects);
});

// POST /api/classes/subjects
router.post('/subjects', requireAuth, (req, res) => {
    const { name, max_marks } = req.body;
    if (!name) return res.status(400).json({ error: 'Subject name is required.' });
    try {
        const result = run('INSERT INTO subjects (name, max_marks) VALUES (?, ?)', [name, max_marks || 100]);
        const subject = queryOne('SELECT * FROM subjects WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(subject);
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Subject already exists.' });
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/classes/subjects/:id
router.delete('/subjects/:id', requireAuth, (req, res) => {
    const subject = queryOne('SELECT id FROM subjects WHERE id = ?', [req.params.id]);
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });
    run('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

// GET /api/classes
router.get('/', (req, res) => {
    const classes = query('SELECT * FROM classes ORDER BY name, section');
    res.json(classes);
});

// POST /api/classes
router.post('/', requireAuth, (req, res) => {
    const { name, section } = req.body;
    if (!name) return res.status(400).json({ error: 'Class name is required.' });
    try {
        const result = run('INSERT INTO classes (name, section) VALUES (?, ?)', [name, section || 'A']);
        const cls = queryOne('SELECT * FROM classes WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(cls);
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Class already exists.' });
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/classes/:id
router.delete('/:id', requireAuth, (req, res) => {
    const cls = queryOne('SELECT id FROM classes WHERE id = ?', [req.params.id]);
    if (!cls) return res.status(404).json({ error: 'Class not found.' });
    run('UPDATE students SET class_id = NULL WHERE class_id = ?', [req.params.id]);
    run('DELETE FROM classes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

module.exports = router;
