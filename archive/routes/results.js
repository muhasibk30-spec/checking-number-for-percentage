const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../database');
const { requireAuth } = require('../middleware/auth');

function calculateGrade(avg) {
    if (avg >= 90) return 'A';
    if (avg >= 80) return 'B';
    if (avg >= 70) return 'C';
    if (avg >= 60) return 'D';
    if (avg >= 33) return 'F';
    return 'G';
}

// GET /api/results/stats — must be before /:id to avoid route conflict
router.get('/stats', requireAuth, (req, res) => {
    const r = queryOne("SELECT COUNT(DISTINCT student_db_id) as totalStudents, COUNT(*) as totalResults FROM results");
    const passCount = queryOne("SELECT COUNT(*) as count FROM results WHERE status = 'Pass'")?.count || 0;
    const failCount = queryOne("SELECT COUNT(*) as count FROM results WHERE status = 'Fail'")?.count || 0;
    const total = r.totalResults || 0;
    const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

    const topStudent = queryOne(`
    SELECT s.name, s.student_id, AVG(r.marks) as avg_marks
    FROM results r JOIN students s ON r.student_db_id = s.id
    GROUP BY r.student_db_id ORDER BY avg_marks DESC LIMIT 1
  `);

    res.json({
        totalStudents: r.totalStudents || 0,
        totalResults: r.totalResults || 0,
        passCount, failCount, passRate, topStudent
    });
});

// GET /api/results
router.get('/', (req, res) => {
    const results = query(`
    SELECT r.id, r.subject, r.marks, r.max_marks, r.grade, r.status, r.created_at,
           s.student_id, s.name,
           c.name as class_name, c.section
    FROM results r
    JOIN students s ON r.student_db_id = s.id
    LEFT JOIN classes c ON s.class_id = c.id
    ORDER BY r.created_at DESC
  `);

    const formatted = results.map(r => ({
        id: r.id,
        studentId: r.student_id,
        name: r.name,
        subject: r.subject,
        marks: r.marks,
        total: r.marks,
        average: r.marks,
        grade: r.grade,
        status: r.status,
        created_at: r.created_at,
        class: r.class_name ? `${r.class_name} — ${r.section}` : null
    }));

    res.json(formatted);
});

// POST /api/results
router.post('/', (req, res) => {
    const { id: student_id, name, math, science, english } = req.body;
    if (!student_id || !name) {
        return res.status(400).json({ error: 'Student ID and name are required.' });
    }
    try {
        let student = queryOne('SELECT * FROM students WHERE student_id = ?', [student_id]);
        if (!student) {
            const ins = run('INSERT INTO students (student_id, name) VALUES (?, ?)', [student_id, name]);
            student = queryOne('SELECT * FROM students WHERE id = ?', [ins.lastInsertRowid]);
        }

        const subjects = [
            { name: 'Mathematics', marks: parseFloat(math) || 0 },
            { name: 'Science', marks: parseFloat(science) || 0 },
            { name: 'English', marks: parseFloat(english) || 0 }
        ];

        subjects.forEach(item => {
            const grade = calculateGrade(item.marks);
            const status = item.marks >= 33 ? 'Pass' : 'Fail';
            run('INSERT INTO results (student_db_id, subject, marks, max_marks, grade, status) VALUES (?, ?, ?, 100, ?, ?)',
                [student.id, item.name, item.marks, grade, status]);
        });

        res.status(201).json({ success: true, studentId: student_id, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/results/:id
router.delete('/:id', requireAuth, (req, res) => {
    const result = queryOne('SELECT id FROM results WHERE id = ?', [req.params.id]);
    if (!result) return res.status(404).json({ error: 'Result not found.' });
    run('DELETE FROM results WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

module.exports = router;
