const express = require('express');
const { db } = require('../database/init');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function logRecord(action, entityType, entityId, performedBy, details) {
  db.prepare(`
    INSERT INTO records (action, entity_type, entity_id, performed_by, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(action, entityType, entityId, performedBy, details);
}

function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

router.get('/', authenticate, (req, res) => {
  const { status, user_id } = req.query;
  let query = `
    SELECT i.*, b.title AS book_title, b.author AS book_author, b.isbn,
           u.name AS user_name, u.email AS user_email
    FROM issues i
    JOIN books b ON i.book_id = b.id
    JOIN users u ON i.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'user') {
    query += ' AND i.user_id = ?';
    params.push(req.user.id);
  } else if (user_id) {
    query += ' AND i.user_id = ?';
    params.push(user_id);
  }

  if (status) {
    query += ' AND i.status = ?';
    params.push(status);
  }

  query += ' ORDER BY i.issue_date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/issue', authenticate, authorize('librarian'), (req, res) => {
  const { book_id, user_id, days = 14 } = req.body;

  if (!book_id || !user_id) {
    return res.status(400).json({ error: 'Book ID and user ID are required' });
  }

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  if (book.available_copies < 1) {
    return res.status(400).json({ error: 'No copies available for this book' });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'user'").get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const dueDate = addDays(new Date().toISOString().split('T')[0], parseInt(days, 10) || 14);

  const issueBook = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO issues (book_id, user_id, due_date, status)
      VALUES (?, ?, ?, 'issued')
    `).run(book_id, user_id, dueDate);

    db.prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?').run(book_id);
    return result.lastInsertRowid;
  });

  const issueId = issueBook();
  logRecord('issue', 'issue', issueId, req.user.id, `Issued "${book.title}" to ${user.name}`);
  res.status(201).json({ id: issueId, message: 'Book issued successfully', due_date: dueDate });
});

router.post('/:id/return', authenticate, authorize('librarian'), (req, res) => {
  const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue record not found' });
  if (issue.status === 'returned') {
    return res.status(400).json({ error: 'Book already returned' });
  }

  const returnBook = db.transaction(() => {
    const returnDate = new Date().toISOString().split('T')[0];
    db.prepare(`
      UPDATE issues SET return_date = ?, status = 'returned' WHERE id = ?
    `).run(returnDate, issue.id);

    db.prepare('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?').run(issue.book_id);
    return returnDate;
  });

  const returnDate = returnBook();
  const book = db.prepare('SELECT title FROM books WHERE id = ?').get(issue.book_id);
  logRecord('return', 'issue', issue.id, req.user.id, `Returned "${book.title}"`);
  res.json({ message: 'Book returned successfully', return_date: returnDate });
});

router.post('/request', authenticate, authorize('user'), (req, res) => {
  const { book_id } = req.body;
  if (!book_id) return res.status(400).json({ error: 'Book ID is required' });

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  if (book.available_copies < 1) {
    return res.status(400).json({ error: 'No copies available' });
  }

  const existing = db.prepare(`
    SELECT id FROM issues WHERE book_id = ? AND user_id = ? AND status = 'issued'
  `).get(book_id, req.user.id);

  if (existing) {
    return res.status(400).json({ error: 'You already have this book issued' });
  }

  const dueDate = addDays(new Date().toISOString().split('T')[0], 14);

  const issueBook = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO issues (book_id, user_id, due_date, status)
      VALUES (?, ?, ?, 'issued')
    `).run(book_id, req.user.id, dueDate);

    db.prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?').run(book_id);
    return result.lastInsertRowid;
  });

  const issueId = issueBook();
  logRecord('request', 'issue', issueId, req.user.id, `User requested "${book.title}"`);
  res.status(201).json({ id: issueId, message: 'Book issued successfully', due_date: dueDate });
});

module.exports = router;
