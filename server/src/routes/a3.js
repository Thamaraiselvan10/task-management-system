import express from 'express';
import pool from '../config/db.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/a3 - Get A3 items (filtered by role)
router.get('/', authenticate, async (req, res) => {
    try {
        let query;
        let params = [];

        if (req.user.role === 'ADMIN') {
            // Admin sees all A3 items with assignees aggregated
            query = `
                SELECT a.*,
                    COALESCE(
                        json_agg(
                            json_build_object('id', u.id, 'name', u.name, 'email', u.email)
                        ) FILTER (WHERE u.id IS NOT NULL), '[]'
                    ) as assignees
                FROM a3_items a
                LEFT JOIN a3_assignments aa ON a.id = aa.a3_id
                LEFT JOIN users u ON aa.user_id = u.id
                GROUP BY a.id
                ORDER BY a.created_at DESC
            `;
        } else {
            // Staff sees only their assigned A3 items
            query = `
                SELECT a.*,
                    COALESCE(
                        json_agg(
                            json_build_object('id', u.id, 'name', u.name, 'email', u.email)
                        ) FILTER (WHERE u.id IS NOT NULL), '[]'
                    ) as assignees
                FROM a3_items a
                JOIN a3_assignments aa ON a.id = aa.a3_id
                JOIN users u ON aa.user_id = u.id
                WHERE a.id IN (
                    SELECT a3_id FROM a3_assignments WHERE user_id = $1
                )
                GROUP BY a.id
                ORDER BY a.created_at DESC
            `;
            params = [req.user.id];
        }

        const result = await pool.query(query, params);
        res.json({ a3_items: result.rows });
    } catch (error) {
        console.error('Error fetching A3 items:', error);
        res.status(500).json({ error: 'Failed to fetch A3 items.' });
    }
});

// POST /api/a3 - Create a new A3 item (Admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
    const client = await pool.connect();

    try {
        const { name, amount, assignees } = req.body;

        if (!name || amount === undefined || !assignees || assignees.length === 0) {
            return res.status(400).json({
                error: 'Name, amount, and at least one assignee are required.'
            });
        }

        await client.query('BEGIN');

        // Create A3 item
        const a3Result = await client.query(`
            INSERT INTO a3_items (name, amount, created_by)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [name, amount, req.user.id]);

        const a3Item = a3Result.rows[0];

        // Create assignments
        for (const userId of assignees) {
            await client.query(`
                INSERT INTO a3_assignments (a3_id, user_id)
                VALUES ($1, $2)
            `, [a3Item.id, userId]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: 'A3 item created successfully.',
            a3_item: a3Item
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating A3 item:', error);
        res.status(500).json({ error: 'Failed to create A3 item.' });
    } finally {
        client.release();
    }
});

// PUT /api/a3/:id - Update A3 item status (Staff only for status update)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comment } = req.body;

        // Get existing A3 item
        const existingA3 = await pool.query('SELECT * FROM a3_items WHERE id = $1', [id]);

        if (existingA3.rows.length === 0) {
            return res.status(404).json({ error: 'A3 item not found.' });
        }

        // Only staff can update status
        if (req.user.role !== 'STAFF') {
            return res.status(403).json({ error: 'Only staff can update A3 status.' });
        }

        // Verify staff is assigned to this A3
        const assignment = await pool.query(
            'SELECT * FROM a3_assignments WHERE a3_id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (assignment.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized to update this A3 item.' });
        }

        // For marking as Completed, comment is required
        if (status === 'Completed' && (!comment || comment.trim() === '')) {
            return res.status(400).json({ error: 'Comment is required when marking A3 as completed.' });
        }

        // Update status and comment
        if (status && ['Pending', 'Completed'].includes(status)) {
            const completedAt = status === 'Completed' ? new Date() : null;
            await pool.query(
                'UPDATE a3_items SET status = $1, comment = $2, completed_at = $3 WHERE id = $4',
                [status, comment || null, completedAt, id]
            );
        }

        res.json({ message: 'A3 item updated successfully.' });
    } catch (error) {
        console.error('Error updating A3 item:', error);
        res.status(500).json({ error: 'Failed to update A3 item.' });
    }
});

// DELETE /api/a3/:id - Delete A3 item (Admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM a3_items WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'A3 item not found.' });
        }

        res.json({ message: 'A3 item deleted successfully.' });
    } catch (error) {
        console.error('Error deleting A3 item:', error);
        res.status(500).json({ error: 'Failed to delete A3 item.' });
    }
});

export default router;
