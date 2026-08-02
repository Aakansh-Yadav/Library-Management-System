const express = require('express');
const { db } = require('../database/init');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('librarian'), (req, res) => {
  const { action, entity_type, limit = 100 } = req.query;

  let query = `
    SELECT r.*, u.name AS performed_by_name
    FROM records r
    JOIN users u ON r.performed_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (action) {
    query += ' AND r.action = ?';
    params.push(action);
  }

  if (entity_type) {
    query += ' AND r.entity_type = ?';
    params.push(entity_type);
  }

  query += ' ORDER BY r.created_at DESC LIMIT ?';
  params.push(Math.min(parseInt(limit, 10) || 100, 500));

  res.json(db.prepare(query).all(...params));
});

router.get('/stats', authenticate, authorize('librarian'), (req, res) => {
  const stats = {
    total_books: db.prepare('SELECT COUNT(*) AS count FROM books').get().count,
    total_users: db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'user'").get().count,
    books_issued: db.prepare("SELECT COUNT(*) AS count FROM issues WHERE status = 'issued'").get().count,
    books_available: db.prepare('SELECT SUM(available_copies) AS count FROM books').get().count || 0,
    overdue: db.prepare(`
      SELECT COUNT(*) AS count FROM issues
      WHERE status = 'issued' AND due_date < date('now')
    `).get().count
  };

  res.json(stats);
});

module.exports = router;
