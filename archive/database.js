const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'perfinted.db')
  : path.join(__dirname, 'perfinted.db');

let db = null;

// Save DB to disk
function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.warn('[DB] Could not write database to disk:', err.message);
  }
}

// Run schema + seeds
function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      section TEXT NOT NULL DEFAULT 'A',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, section)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      max_marks INTEGER NOT NULL DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_db_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      marks REAL NOT NULL,
      max_marks REAL NOT NULL DEFAULT 100,
      grade TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed admin
  const adminCount = db.exec("SELECT COUNT(*) as count FROM admins")[0];
  if (!adminCount || adminCount.values[0][0] === 0) {
    const hash = bcrypt.hashSync('Khan123', 10);
    db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    console.log('[DB] Default admin created: admin / Khan123');
  }

  // Seed subjects
  const subCount = db.exec("SELECT COUNT(*) as count FROM subjects")[0];
  if (!subCount || subCount.values[0][0] === 0) {
    ['Mathematics', 'Science', 'English', 'History', 'Computer Science'].forEach(s => {
      db.run('INSERT INTO subjects (name, max_marks) VALUES (?, ?)', [s, 100]);
    });
    console.log('[DB] Default subjects seeded.');
  }

  // Seed classes
  const clsCount = db.exec("SELECT COUNT(*) as count FROM classes")[0];
  if (!clsCount || clsCount.values[0][0] === 0) {
    [['Class 9', 'A'], ['Class 9', 'B'], ['Class 10', 'A'], ['Class 10', 'B'], ['Class 11', 'A'], ['Class 12', 'A']]
      .forEach(([n, s]) => db.run('INSERT INTO classes (name, section) VALUES (?, ?)', [n, s]));
    console.log('[DB] Default classes seeded.');
  }

  saveDb();
}

// Helper: convert sql.js result to array of objects
function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

// Synchronous-style interface over sql.js
function getDb() { return db; }

// Initialize async
async function initDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // On Vercel, copy bundled database to /tmp if present and not yet created in /tmp
  const bundledDb = path.join(__dirname, 'perfinted.db');
  if (process.env.VERCEL && !fs.existsSync(DB_PATH) && fs.existsSync(bundledDb)) {
    try {
      fs.copyFileSync(bundledDb, DB_PATH);
    } catch (e) {
      console.warn('[DB] Could not copy bundled DB to /tmp:', e.message);
    }
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      console.log('[DB] Loaded existing database from disk.');
    } catch (err) {
      console.warn('[DB] Failed to load disk DB, creating fresh DB:', err.message);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('[DB] Created new database.');
  }

  initSchema();
  return db;
}

// Universal query helpers — use prepare() so ? params are properly bound
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec('SELECT last_insert_rowid() as id')[0];
  const changes = db.exec('SELECT changes() as c')[0];
  saveDb();
  return {
    lastInsertRowid: lastId ? lastId.values[0][0] : null,
    changes: changes ? changes.values[0][0] : 0
  };
}

module.exports = { initDb, query, queryOne, run, saveDb };
