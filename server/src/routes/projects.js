const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { workspace_id } = req.query;
  const db = req.app.locals.db;
  try {
    let query = `
      SELECT p.*,
        u.name as owner_name,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks
      FROM projects p
      JOIN workspaces w ON p.workspace_id = w.id
      JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
    `;
    const params = [req.user.id];
    if (workspace_id) {
      query += ' WHERE p.workspace_id = $2';
      params.push(workspace_id);
    }
    query += ' GROUP BY p.id, u.name ORDER BY p.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/', async (req, res) => {
  const { workspace_id, name, description, color, due_date } = req.body;
  if (!workspace_id || !name) return res.status(400).json({ error: 'workspace_id and name required' });
  const db = req.app.locals.db;
  try {
    const access = await db.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspace_id, req.user.id]
    );
    if (access.rows.length === 0) return res.status(403).json({ error: 'No access to workspace' });
    const result = await db.query(
      'INSERT INTO projects (workspace_id, name, description, color, due_date, owner_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [workspace_id, name, description || '', color || '#6366f1', due_date || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.get('/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(`
      SELECT p.*,
        u.name as owner_name,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks
      FROM projects p
      JOIN workspaces w ON p.workspace_id = w.id
      JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.id = $1
      GROUP BY p.id, u.name
    `, [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.put('/:id', async (req, res) => {
  const { name, description, status, color, due_date } = req.body;
  const db = req.app.locals.db;
  try {
    const result = await db.query(`
      UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description),
        status = COALESCE($3, status), color = COALESCE($4, color), due_date = COALESCE($5, due_date),
        updated_at = NOW()
      WHERE id = $6
        AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $7)
      RETURNING *
    `, [name, description, status, color, due_date, req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    await db.query(`
      DELETE FROM projects WHERE id = $1
        AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $2 AND role IN ('admin','manager'))
    `, [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
