const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database/init');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function logRecord(action, entityType, entityId, performedBy, details) {
  db.prepare(`
    INSERT INTO records (action, entity_type, entity_id, performed_by, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(action, entityType, entityId, performedBy, details);
}

router.get('/', authenticate, authorize('librarian'), (req, res) => {
  const users = db.prepare(`
    SELECT id, name, email, role, created_at FROM users ORDER BY role, name
  `).all();
  res.json(users);
});

router.get('/:id', authenticate, (req, res) => {
  if (req.user.role !== 'librarian' && req.user.id !== parseInt(req.params.id, 10)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const user = db.prepare(`
    SELECT id, name, email, role, created_at FROM users WHERE id = ?
  `).get(req.params.id);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.post('/', authenticate, authorize('librarian'), (req, res) => {
  const { name, email, password, role = 'user' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (!['user', 'librarian'].includes(role)) {
    return res.status(400).json({ error: 'Role must be user or librarian' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
    `).run(name, email, bcrypt.hashSync(password, 10), role);

    logRecord('create', 'user', result.lastInsertRowid, req.user.id, `Created user: ${name}`);
    res.status(201).json({ id: result.lastInsertRowid, message: 'User created successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    throw err;
  }
});

router.put('/:id', authenticate, authorize('librarian'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, email, password, role } = req.body;

  try {
    if (password) {
      db.prepare(`
        UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?
      `).run(
        name || user.name,
        email || user.email,
        bcrypt.hashSync(password, 10),
        role || user.role,
        req.params.id
      );
    } else {
      db.prepare(`
        UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?
      `).run(name || user.name, email || user.email, role || user.role, req.params.id);
    }

    logRecord('update', 'user', user.id, req.user.id, `Updated user: ${name || user.name}`);
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    throw err;
  }
});

router.delete('/:id', authenticate, authorize('librarian'), (req, res) => {
  if (parseInt(req.params.id, 10) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const activeIssues = db.prepare(`
    SELECT COUNT(*) AS count FROM issues WHERE user_id = ? AND status = 'issued'
  `).get(req.params.id).count;

  if (activeIssues > 0) {
    return res.status(400).json({ error: 'Cannot delete user with active book issues' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  logRecord('delete', 'user', user.id, req.user.id, `Deleted user: ${user.name}`);
  res.json({ message: 'User deleted successfully' });
});

module.exports = router;
