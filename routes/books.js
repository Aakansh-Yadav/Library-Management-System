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

router.get('/', authenticate, (req, res) => {
  const { search, category } = req.query;
  let query = 'SELECT * FROM books WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY title ASC';
  res.json(db.prepare(query).all(...params));
});

router.get('/categories', authenticate, (req, res) => {
  const categories = db.prepare('SELECT DISTINCT category FROM books ORDER BY category').all();
  res.json(categories.map((c) => c.category));
});

router.get('/:id', authenticate, (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

router.post('/', authenticate, authorize('librarian'), (req, res) => {
  const { title, author, isbn, category, total_copies } = req.body;

  if (!title || !author || !isbn || !category) {
    return res.status(400).json({ error: 'Title, author, ISBN, and category are required' });
  }

  const copies = Math.max(1, parseInt(total_copies, 10) || 1);

  try {
    const result = db.prepare(`
      INSERT INTO books (title, author, isbn, category, total_copies, available_copies)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, author, isbn, category, copies, copies);

    logRecord('create', 'book', result.lastInsertRowid, req.user.id, `Added book: ${title}`);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Book added successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A book with this ISBN already exists' });
    }
    throw err;
  }
});

router.put('/:id', authenticate, authorize('librarian'), (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const { title, author, isbn, category, total_copies } = req.body;
  const newTotal = total_copies !== undefined ? Math.max(1, parseInt(total_copies, 10)) : book.total_copies;
  const issued = book.total_copies - book.available_copies;
  const newAvailable = Math.max(0, newTotal - issued);

  try {
    db.prepare(`
      UPDATE books
      SET title = ?, author = ?, isbn = ?, category = ?, total_copies = ?, available_copies = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title || book.title,
      author || book.author,
      isbn || book.isbn,
      category || book.category,
      newTotal,
      newAvailable,
      req.params.id
    );

    logRecord('update', 'book', book.id, req.user.id, `Updated book: ${title || book.title}`);
    res.json({ message: 'Book updated successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A book with this ISBN already exists' });
    }
    throw err;
  }
});

router.delete('/:id', authenticate, authorize('librarian'), (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const activeIssues = db.prepare(`
    SELECT COUNT(*) AS count FROM issues WHERE book_id = ? AND status = 'issued'
  `).get(req.params.id).count;

  if (activeIssues > 0) {
    return res.status(400).json({ error: 'Cannot delete a book with active issues' });
  }

  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  logRecord('delete', 'book', book.id, req.user.id, `Deleted book: ${book.title}`);
  res.json({ message: 'Book deleted successfully' });
});

module.exports = router;
