const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database/init');

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const issueRoutes = require('./routes/issues');
const userRoutes = require('./routes/users');
const recordRoutes = require('./routes/records');

initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/users', userRoutes);
app.use('/api/records', recordRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Library Management System is running' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Library Management System running at http://localhost:${PORT}`);
  console.log('Default accounts:');
  console.log('  Librarian: librarian@library.com / librarian123');
  console.log('  User:      user@library.com / user123');
});
