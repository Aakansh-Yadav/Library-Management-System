const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'library.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('librarian', 'user')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      issue_date TEXT NOT NULL DEFAULT (date('now')),
      due_date TEXT NOT NULL,
      return_date TEXT,
      status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued', 'returned', 'overdue')),
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      performed_by INTEGER NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (performed_by) REFERENCES users(id)
    );
  `);

  seedDefaultData();
}

function seedDefaultData() {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount > 0) return;

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
  );

  insertUser.run('Admin Librarian', 'librarian@library.com', bcrypt.hashSync('librarian123', 10), 'librarian');
  insertUser.run('John Doe', 'user@library.com', bcrypt.hashSync('user123', 10), 'user');
  insertUser.run('Jane Smith', 'jane@library.com', bcrypt.hashSync('user123', 10), 'user');

  const insertBook = db.prepare(`
    INSERT INTO books (title, author, isbn, category, total_copies, available_copies)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const books = [
    ['The Great Gatsby', 'F. Scott Fitzgerald', '978-0743273565', 'Fiction', 3, 3],
    ['To Kill a Mockingbird', 'Harper Lee', '978-0061120084', 'Fiction', 2, 2],
    ['Introduction to Algorithms', 'Thomas H. Cormen', '978-0262046305', 'Computer Science', 4, 4],
    ['Clean Code', 'Robert C. Martin', '978-0132350884', 'Computer Science', 3, 3],
    ['Sapiens', 'Yuval Noah Harari', '978-0062316097', 'History', 2, 2],
    ['The Pragmatic Programmer', 'Andrew Hunt', '978-0201616224', 'Computer Science', 2, 2]
  ];

  books.forEach((book) => insertBook.run(...book));

  const librarian = db.prepare("SELECT id FROM users WHERE role = 'librarian' LIMIT 1").get();
  const insertRecord = db.prepare(`
    INSERT INTO records (action, entity_type, entity_id, performed_by, details)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertRecord.run('seed', 'system', null, librarian.id, 'Database initialized with default users and books');
}

module.exports = { db, initializeDatabase };
