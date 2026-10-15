const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/results', require('./routes/results'));
app.use('/api/classes', require('./routes/classes'));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all: serve index.html for any unknown routes (SPA-like behavior)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server after DB is ready
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 Perfinted server running at http://localhost:${PORT}`);
        console.log(`   Dashboard : http://localhost:${PORT}/dashboard.html`);
        console.log(`   Admin CMS : http://localhost:${PORT}/admin/login.html`);
        console.log(`   Credentials: admin / Khan123\n`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
