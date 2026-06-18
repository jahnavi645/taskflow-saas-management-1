const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { project_id, status, assignee_id } = req.query;
  const db = req.app.locals.db;
  try {
    let query = `
      SELECT t.*,
        u.name as assignee_name, u.avatar_url as assignee_avatar,
        c.name as creator_name,
        COUNT(cm.id) as comment_count
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspaces w ON p.workspace_id = w.id
      JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users c ON t.created_by = c.id
      LEFT JOIN comments cm ON t.id = cm.task_id
      WHERE 1=1
    `;
    const params = [req.user.id];
    let idx = 2;
    if (project_id) { query += ` AND t.project_id = $${idx++}`; params.push(project_id); }
    if (status) { query += ` AND t.status = $${idx++}`; params.push(status); }
    if (assignee_id) { query += ` AND t.assignee_id = $${idx++}`; params.push(assignee_id); }
    query += ' GROUP BY t.id, u.name, u.avatar_url, c.name ORDER BY t.position ASC, t.created_at ASC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.post('/', async (req, res) => {
  const { project_id, title, description, status, priority, assignee_id, due_date, labels } = req.body;
  if (!project_id || !title) return res.status(400).json({ error: 'project_id and title required' });
  const db = req.app.locals.db;
  try {
    const posResult = await db.query(
      'SELECT COALESCE(MAX(position), -1) + 1 as pos FROM tasks WHERE project_id = $1 AND status = $2',
      [project_id, status || 'todo']
    );
    const pos = posResult.rows[0].pos;
    const result = await db.query(
      `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, due_date, labels, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [project_id, title, description || '', status || 'todo', priority || 'medium',
       assignee_id || null, req.user.id, due_date || null, labels || [], pos]
    );
    const task = result.rows[0];
    if (assignee_id && assignee_id !== req.user.id) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, related_task_id)
         VALUES ($1,'task_assigned','New task assigned','You have been assigned a new task: ' || $2, $3)`,
        [assignee_id, title, task.id]
      );
    }
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.get('/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(`
      SELECT t.*,
        u.name as assignee_name, u.avatar_url as assignee_avatar,
        c.name as creator_name, p.name as project_name, p.color as project_color
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN workspaces w ON p.workspace_id = w.id
      JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.id = $1
    `, [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

router.put('/:id', async (req, res) => {
  const { title, description, status, priority, assignee_id, due_date, labels, position } = req.body;
  const db = req.app.locals.db;
  try {
    const old = await db.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const result = await db.query(`
      UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        assignee_id = COALESCE($5, assignee_id),
        due_date = COALESCE($6, due_date),
        labels = COALESCE($7, labels),
        position = COALESCE($8, position),
        updated_at = NOW()
      WHERE id = $9 RETURNING *
    `, [title, description, status, priority, assignee_id, due_date, labels, position, req.params.id]);
    const task = result.rows[0];
    if (assignee_id && assignee_id !== old.rows[0].assignee_id && assignee_id !== req.user.id) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, related_task_id)
         VALUES ($1,'task_assigned','Task assigned to you', $2, $3)`,
        [assignee_id, `You've been assigned: ${task.title}`, task.id]
      );
    }
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    await db.query(`
      DELETE FROM tasks WHERE id = $1
        AND project_id IN (
          SELECT p.id FROM projects p
          JOIN workspaces w ON p.workspace_id = w.id
          JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
        )
    `, [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

router.put('/reorder/bulk', async (req, res) => {
  const { tasks } = req.body;
  const db = req.app.locals.db;
  try {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      for (const t of tasks) {
        await client.query('UPDATE tasks SET status = $1, position = $2, updated_at = NOW() WHERE id = $3', [t.status, t.position, t.id]);
      }
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder tasks' });
  }
});

module.exports = router;
