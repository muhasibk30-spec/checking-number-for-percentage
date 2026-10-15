// Shared config — prevents circular dependency between routes/auth.js and middleware/auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'perfinted_secret_2024_!@#';

module.exports = { JWT_SECRET };
