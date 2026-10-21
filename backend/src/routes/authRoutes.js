const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'invision-u-secret-key-2025';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Логин и пароль обязательны' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Неверный логин или пароль' });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// GET /api/auth/me — check current session
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Не авторизован' });

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    res.json({ id: decoded.id, username: decoded.username, role: decoded.role });
  } catch {
    res.status(401).json({ error: 'Токен истёк или невалиден' });
  }
});

module.exports = router;

// Auth middleware — exported separately
module.exports.requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Требуется авторизация' });

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Токен истёк или невалиден' });
  }
};
