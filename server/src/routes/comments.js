const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/:taskId', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await db.query(`
      SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = $1
      ORDER BY c.created_at ASC
    `, [req.params.taskId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

router.post('/:taskId', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const db = req.app.locals.db;
  try {
    const task = await db.query('SELECT * FROM tasks WHERE id = $1', [req.params.taskId]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const result = await db.query(
      'INSERT INTO comments (task_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.params.taskId, req.user.id, content]
    );
    const comment = result.rows[0];
    const userResult = await db.query('SELECT name, avatar_url FROM users WHERE id = $1', [req.user.id]);
    if (task.rows[0].assignee_id && task.rows[0].assignee_id !== req.user.id) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, related_task_id)
         VALUES ($1,'comment_added','New comment on your task', $2, $3)`,
        [task.rows[0].assignee_id, `${userResult.rows[0].name} commented on: ${task.rows[0].title}`, req.params.taskId]
      );
    }
    res.status(201).json({ ...comment, user_name: userResult.rows[0].name, user_avatar: userResult.rows[0].avatar_url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.delete('/:taskId/:commentId', async (req, res) => {
  const db = req.app.locals.db;
  try {
    await db.query('DELETE FROM comments WHERE id = $1 AND user_id = $2', [req.params.commentId, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
