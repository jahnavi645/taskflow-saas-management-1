const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(`
      SELECT w.*, wm.role,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
        (SELECT COUNT(*) FROM projects WHERE workspace_id = w.id) as project_count
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.user_id = $1
      ORDER BY w.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

router.post('/', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const db = req.app.locals.db;
  try {
    const result = await db.query(
      'INSERT INTO workspaces (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || '', req.user.id]
    );
    const ws = result.rows[0];
    await db.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
      [ws.id, req.user.id, 'admin']
    );
    res.status(201).json(ws);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

router.get('/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const ws = await db.query(`
      SELECT w.*, wm.role FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE w.id = $1 AND wm.user_id = $2
    `, [req.params.id, req.user.id]);
    if (ws.rows.length === 0) return res.status(404).json({ error: 'Workspace not found' });

    const members = await db.query(`
      SELECT u.id, u.name, u.email, u.avatar_url, wm.role, wm.joined_at
      FROM workspace_members wm
      JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = $1
    `, [req.params.id]);

    res.json({ ...ws.rows[0], members: members.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

router.put('/:id', async (req, res) => {
  const { name, description } = req.body;
  const db = req.app.locals.db;
  try {
    const check = await db.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0 || check.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const result = await db.query(
      'UPDATE workspaces SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name, description, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

router.post('/:id/invite', async (req, res) => {
  const { email, role } = req.body;
  const db = req.app.locals.db;
  try {
    const check = await db.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0 || !['admin', 'manager'].includes(check.rows[0].role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const invitee = userResult.rows[0];
    await db.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = $3',
      [req.params.id, invitee.id, role || 'member']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

module.exports = router;
