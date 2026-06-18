const express = require('express');
const bcrypt = require('bcryptjs');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/search', async (req, res) => {
  const { q, workspace_id } = req.query;
  const db = req.app.locals.db;
  try {
    let result;
    if (workspace_id) {
      result = await db.query(`
        SELECT u.id, u.name, u.email, u.avatar_url, wm.role
        FROM users u
        JOIN workspace_members wm ON u.id = wm.user_id
        WHERE wm.workspace_id = $1 AND (u.name ILIKE $2 OR u.email ILIKE $2)
        LIMIT 20
      `, [workspace_id, `%${q || ''}%`]);
    } else {
      result = await db.query(
        'SELECT id, name, email, avatar_url FROM users WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 20',
        [`%${q || ''}%`]
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/notifications', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  const db = req.app.locals.db;
  try {
    await db.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification' });
  }
});

router.put('/notifications/read-all', async (req, res) => {
  const db = req.app.locals.db;
  try {
    await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications' });
  }
});

router.put('/profile', async (req, res) => {
  const { name, avatar_url } = req.body;
  const db = req.app.locals.db;
  try {
    const result = await db.query(
      'UPDATE users SET name = COALESCE($1, name), avatar_url = COALESCE($2, avatar_url), updated_at = NOW() WHERE id = $3 RETURNING id, name, email, avatar_url',
      [name, avatar_url, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/password', async (req, res) => {
  const { current_password, new_password } = req.body;
  const db = req.app.locals.db;
  try {
    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;
