import express from 'express';
import pool from '../config/db.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';
import { getTaskAssignedEmailTemplate, getTaskCompletedEmailTemplate } from '../utils/emailTemplates.js';

const router = express.Router();

// GET /api/tasks - Get tasks (filtered by role)
router.get('/', authenticate, async (req, res) => {
    try {
        let query;
        let params = [];

        if (req.user.role === 'ADMIN') {
            // Admin sees all tasks
            query = `
        SELECT t.*, u.name as created_by_name,
          (SELECT json_agg(json_build_object('id', us.id, 'name', us.name, 'email', us.email))
           FROM task_assignments ta
           JOIN users us ON ta.user_id = us.id
           WHERE ta.task_id = t.id) as assignees,
          (SELECT tu.comment FROM task_updates tu WHERE tu.task_id = t.id AND tu.comment IS NOT NULL ORDER BY tu.created_at DESC LIMIT 1) as latest_comment
        FROM tasks t
        JOIN users u ON t.created_by = u.id
        ORDER BY t.deadline ASC, t.priority DESC
      `;
        } else {
            // Staff sees only assigned tasks
            query = `
        SELECT t.*, u.name as created_by_name,
          (SELECT json_agg(json_build_object('id', us.id, 'name', us.name, 'email', us.email))
           FROM task_assignments ta2
           JOIN users us ON ta2.user_id = us.id
           WHERE ta2.task_id = t.id) as assignees,
          (SELECT tu.comment FROM task_updates tu WHERE tu.task_id = t.id AND tu.comment IS NOT NULL ORDER BY tu.created_at DESC LIMIT 1) as latest_comment
        FROM tasks t
        JOIN users u ON t.created_by = u.id
        JOIN task_assignments ta ON t.id = ta.task_id
        WHERE ta.user_id = $1
        ORDER BY t.deadline ASC, t.priority DESC
      `;
            params = [req.user.id];
        }

        const result = await pool.query(query, params);
        res.json({ tasks: result.rows });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks.' });
    }
});

// GET /api/tasks/:id - Get single task details
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Get task with assignees
        const taskResult = await pool.query(`
      SELECT t.*, u.name as created_by_name,
        (SELECT json_agg(json_build_object('id', us.id, 'name', us.name, 'email', us.email))
         FROM task_assignments ta
         JOIN users us ON ta.user_id = us.id
         WHERE ta.task_id = t.id) as assignees
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `, [id]);

        if (taskResult.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found.' });
        }

        const task = taskResult.rows[0];

        // If staff, verify they are assigned
        if (req.user.role === 'STAFF') {
            const isAssigned = task.assignees?.some(a => a.id === req.user.id);
            if (!isAssigned) {
                return res.status(403).json({ error: 'Not assigned to this task.' });
            }
        }

        // Get task updates/comments
        const updatesResult = await pool.query(`
      SELECT tu.*, u.name as user_name
      FROM task_updates tu
      JOIN users u ON tu.user_id = u.id
      WHERE tu.task_id = $1
      ORDER BY tu.created_at DESC
    `, [id]);

        res.json({
            task,
            updates: updatesResult.rows
        });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Failed to fetch task.' });
    }
});

// POST /api/tasks - Create a new task (Admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
    const client = await pool.connect();

    try {
        const { title, description, priority, deadline, assignees } = req.body;

        if (!title || !priority || !deadline || !assignees || assignees.length === 0) {
            return res.status(400).json({
                error: 'Title, priority, deadline, and at least one assignee are required.'
            });
        }

        await client.query('BEGIN');

        // Create task
        const taskResult = await client.query(`
      INSERT INTO tasks (title, description, priority, deadline, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [title, description || '', priority, deadline, req.user.id]);

        const task = taskResult.rows[0];

        // Create assignments
        for (const userId of assignees) {
            await client.query(`
        INSERT INTO task_assignments (task_id, user_id)
        VALUES ($1, $2)
      `, [task.id, userId]);
        }

        await client.query('COMMIT');

        // Send email notifications to assignees (non-blocking)
        const assigneeEmails = await pool.query(
            'SELECT email, name FROM users WHERE id = ANY($1)',
            [assignees]
        );

        for (const assignee of assigneeEmails.rows) {
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
            const emailHtml = getTaskAssignedEmailTemplate({
                name: assignee.name,
                title,
                description,
                priority,
                deadline,
                taskUrl: `${clientUrl}/tasks/${task.id}`
            });

            sendEmail({
                to: assignee.email,
                subject: `New Task Assigned: ${title}`,
                html: emailHtml
            }).catch(err => console.error('Failed to send task notification:', err));
        }

        res.status(201).json({
            message: 'Task created successfully.',
            task
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task.' });
    } finally {
        client.release();
    }
});

// PUT /api/tasks/:id - Update task (status for staff, full for admin)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comment, title, description, priority, deadline, assignees } = req.body;

        // Get existing task
        const existingTask = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

        if (existingTask.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found.' });
        }

        if (req.user.role === 'STAFF') {
            // Staff can only update status and add comments
            if (status) {
                // Comment is mandatory for staff status updates
                if (!comment || !comment.trim()) {
                    return res.status(400).json({ error: 'Comment is required when updating task status.' });
                }

                // Verify staff is assigned
                const assignment = await pool.query(
                    'SELECT id FROM task_assignments WHERE task_id = $1 AND user_id = $2',
                    [id, req.user.id]
                );

                if (assignment.rows.length === 0) {
                    return res.status(403).json({ error: 'Not assigned to this task.' });
                }

                await pool.query(
                    'UPDATE tasks SET status = $1 WHERE id = $2',
                    [status, id]
                );

                // Log status change
                await pool.query(`
          INSERT INTO task_updates (task_id, user_id, status_change, comment)
          VALUES ($1, $2, $3, $4)
        `, [id, req.user.id, status, comment]);

                // Send email to task creator (Admin) if task is completed
                if (status === 'Completed') {
                    const creatorResult = await pool.query(
                        'SELECT email, name FROM users WHERE id = $1',
                        [existingTask.rows[0].created_by]
                    );

                    if (creatorResult.rows.length > 0) {
                        const creator = creatorResult.rows[0];
                        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
                        const emailHtml = getTaskCompletedEmailTemplate({
                            name: creator.name,
                            title: existingTask.rows[0].title,
                            completedBy: req.user.name,
                            comment,
                            taskUrl: `${clientUrl}/tasks/${id}`
                        });

                        sendEmail({
                            to: creator.email,
                            subject: `Task Completed: ${existingTask.rows[0].title}`,
                            html: emailHtml
                        }).catch(err => console.error('Failed to send completion email:', err));
                    }
                }
            }
        } else {
            // Admin can update everything
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                await client.query(`
          UPDATE tasks 
          SET title = COALESCE($1, title),
              description = COALESCE($2, description),
              priority = COALESCE($3, priority),
              deadline = COALESCE($4, deadline),
              status = COALESCE($5, status)
          WHERE id = $6
        `, [title, description, priority, deadline, status, id]);

                // Update assignees if provided
                if (assignees && assignees.length > 0) {
                    // Get current assignees to identify new ones
                    const currentAssignments = await client.query(
                        'SELECT user_id FROM task_assignments WHERE task_id = $1',
                        [id]
                    );
                    const currentAssigneeIds = currentAssignments.rows.map(r => r.user_id);

                    await client.query('DELETE FROM task_assignments WHERE task_id = $1', [id]);

                    for (const userId of assignees) {
                        await client.query(`
              INSERT INTO task_assignments (task_id, user_id)
              VALUES ($1, $2)
            `, [id, userId]);
                    }

                    // Identify new assignees
                    const newAssigneeIds = assignees.filter(id => !currentAssigneeIds.includes(id));

                    if (newAssigneeIds.length > 0) {
                        // Send email to new assignees (non-blocking, after commit)
                        // We'll store them to send after commit
                        req.newAssignees = newAssigneeIds;
                    }
                }

                await client.query('COMMIT');

                // Send emails to new assignees
                if (req.newAssignees && req.newAssignees.length > 0) {
                    const newAssigneeEmails = await pool.query(
                        'SELECT email, name FROM users WHERE id = ANY($1)',
                        [req.newAssignees]
                    );

                    for (const assignee of newAssigneeEmails.rows) {
                        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
                        const emailHtml = getTaskAssignedEmailTemplate({
                            name: assignee.name,
                            title: title || existingTask.rows[0].title,
                            description: description || existingTask.rows[0].description,
                            priority: priority || existingTask.rows[0].priority,
                            deadline: deadline || existingTask.rows[0].deadline,
                            taskUrl: `${clientUrl}/tasks/${id}`
                        });

                        sendEmail({
                            to: assignee.email,
                            subject: `New Task Assigned: ${title || existingTask.rows[0].title}`,
                            html: emailHtml
                        }).catch(err => console.error('Failed to send reassignment email:', err));
                    }
                }
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }

        res.json({ message: 'Task updated successfully.' });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task.' });
    }
});

// DELETE /api/tasks/:id - Delete task (Admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found.' });
        }

        res.json({ message: 'Task deleted successfully.' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task.' });
    }
});

// GET /api/tasks/stats/overview - Get task statistics (Admin only)
router.get('/stats/overview', authenticate, isAdmin, async (req, res) => {
    try {
        const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'Completed') as completed_tasks,
        COUNT(*) FILTER (WHERE deadline < CURRENT_DATE AND status != 'Completed') as overdue_tasks
      FROM tasks
    `);

        res.json({ stats: stats.rows[0] });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics.' });
    }
});

export default router;
