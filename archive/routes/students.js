const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../database');
const { requireAuth } = require('../middleware/auth');

// GET /api/students
router.get('/', requireAuth, (req, res) => {
    const students = query(`
    SELECT s.id, s.student_id, s.name, s.class_id, s.created_at,
           c.name as class_name, c.section
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    ORDER BY s.created_at DESC
  `);
    res.json(students);
});

// POST /api/students
router.post('/', requireAuth, (req, res) => {
    const { student_id, name, class_id } = req.body;
    if (!student_id || !name) {
        return res.status(400).json({ error: 'student_id and name are required.' });
    }
    try {
        const existing = queryOne('SELECT id FROM students WHERE student_id = ?', [student_id]);
        if (existing) return res.status(409).json({ error: 'Student ID already exists.' });

        const result = run('INSERT INTO students (student_id, name, class_id) VALUES (?, ?, ?)',
            [student_id, name, class_id || null]);

        const student = queryOne('SELECT * FROM students WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(student);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/students/:id
router.put('/:id', requireAuth, (req, res) => {
    const { name, class_id, student_id } = req.body;
    try {
        run('UPDATE students SET name = ?, class_id = ?, student_id = ? WHERE id = ?',
            [name, class_id || null, student_id, req.params.id]);
        const student = queryOne('SELECT * FROM students WHERE id = ?', [req.params.id]);
        if (!student) return res.status(404).json({ error: 'Student not found.' });
        res.json(student);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/students/:id
router.delete('/:id', requireAuth, (req, res) => {
    const student = queryOne('SELECT id FROM students WHERE id = ?', [req.params.id]);
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    run('DELETE FROM results WHERE student_db_id = ?', [req.params.id]);
    run('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

module.exports = router;
