const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', async (req, res) => {
  const { workspace_id } = req.query;
  const db = req.app.locals.db;
  try {
    const wsFilter = workspace_id
      ? 'AND p.workspace_id = $2'
      : '';
    const params = workspace_id ? [req.user.id, workspace_id] : [req.user.id];

    const [taskStats, projectStats, recentActivity, myTasks, upcomingDue, overdueCount] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo,
          COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN t.status = 'review' THEN 1 END) as review,
          COUNT(CASE WHEN t.status = 'done' THEN 1 END) as done,
          COUNT(CASE WHEN t.priority = 'high' OR t.priority = 'urgent' THEN 1 END) as high_priority
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        JOIN workspaces w ON p.workspace_id = w.id
        JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
        WHERE 1=1 ${wsFilter}
      `, params),
      db.query(`
        SELECT COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM projects p
        JOIN workspaces w ON p.workspace_id = w.id
        JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
        WHERE 1=1 ${wsFilter}
      `, params),
      db.query(`
        SELECT t.id, t.title, t.status, t.updated_at, p.name as project_name, p.color as project_color,
          u.name as updated_by
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        JOIN workspaces w ON p.workspace_id = w.id
        JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
        LEFT JOIN users u ON t.created_by = u.id
        WHERE 1=1 ${wsFilter}
        ORDER BY t.updated_at DESC LIMIT 10
      `, params),
      db.query(`
        SELECT t.id, t.title, t.status, t.priority, t.due_date, p.name as project_name, p.color as project_color
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        JOIN workspaces w ON p.workspace_id = w.id
        JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
        WHERE t.assignee_id = $1 AND t.status != 'done'
        ${wsFilter}
        ORDER BY t.due_date ASC NULLS LAST, t.priority DESC LIMIT 5
      `, params),
      db.query(`
        SELECT t.id, t.title, t.due_date, t.priority, p.name as project_name, p.color as project_color
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        JOIN workspaces w ON p.workspace_id = w.id
        JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
        WHERE t.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND t.status != 'done'
        ${wsFilter}
        ORDER BY t.due_date ASC LIMIT 5
      `, params),
      db.query(`
        SELECT COUNT(*) as count FROM tasks t
        JOIN projects p ON t.project_id = p.id
        JOIN workspaces w ON p.workspace_id = w.id
        JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
        WHERE t.due_date < NOW() AND t.status != 'done'
        ${wsFilter}
      `, params)
    ]);

    res.json({
      task_stats: taskStats.rows[0],
      project_stats: projectStats.rows[0],
      recent_activity: recentActivity.rows,
      my_tasks: myTasks.rows,
      upcoming_due: upcomingDue.rows,
      overdue_count: overdueCount.rows[0].count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/project/:id', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const [taskBreakdown, memberProgress] = await Promise.all([
      db.query(`
        SELECT status, priority, COUNT(*) as count
        FROM tasks WHERE project_id = $1
        GROUP BY status, priority
      `, [req.params.id]),
      db.query(`
        SELECT u.id, u.name, u.avatar_url,
          COUNT(t.id) as total,
          COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed
        FROM tasks t
        JOIN users u ON t.assignee_id = u.id
        WHERE t.project_id = $1
        GROUP BY u.id, u.name, u.avatar_url
        ORDER BY total DESC
      `, [req.params.id])
    ]);

    res.json({
      task_breakdown: taskBreakdown.rows,
      member_progress: memberProgress.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project analytics' });
  }
});

module.exports = router;
