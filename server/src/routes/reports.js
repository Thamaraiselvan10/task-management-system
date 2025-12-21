import express from 'express';
import pool from '../config/db.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reports - Get daily reports (Admin: all, Staff: own)
router.get('/', authenticate, async (req, res) => {
    try {
        const { date, user_id } = req.query;
        let query;
        let params = [];

        if (req.user.role === 'ADMIN') {
            // Admin can see all reports, with optional filters
            query = `
        SELECT dr.*, u.name as user_name, u.designation
        FROM daily_reports dr
        JOIN users u ON dr.user_id = u.id
        WHERE 1=1
      `;

            if (date) {
                params.push(date);
                query += ` AND dr.report_date = $${params.length}`;
            }

            if (user_id) {
                params.push(user_id);
                query += ` AND dr.user_id = $${params.length}`;
            }

            query += ' ORDER BY dr.report_date DESC, dr.created_at DESC';
        } else {
            // Staff sees only their own reports
            query = `
        SELECT dr.*, u.name as user_name
        FROM daily_reports dr
        JOIN users u ON dr.user_id = u.id
        WHERE dr.user_id = $1
        ORDER BY dr.report_date DESC
      `;
            params = [req.user.id];
        }

        const result = await pool.query(query, params);
        res.json({ reports: result.rows });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports.' });
    }
});

// POST /api/reports - Submit daily report (Staff)
router.post('/', authenticate, async (req, res) => {
    try {
        const { summary, report_date } = req.body;
        const date = report_date || new Date().toISOString().split('T')[0];

        if (!summary) {
            return res.status(400).json({ error: 'Summary is required.' });
        }

        // Check if report already exists for this date
        const existing = await pool.query(
            'SELECT id FROM daily_reports WHERE user_id = $1 AND report_date = $2',
            [req.user.id, date]
        );

        if (existing.rows.length > 0) {
            // Update existing report
            await pool.query(
                'UPDATE daily_reports SET summary = $1 WHERE user_id = $2 AND report_date = $3',
                [summary, req.user.id, date]
            );
            res.json({ message: 'Daily report updated successfully.' });
        } else {
            // Create new report
            const result = await pool.query(`
        INSERT INTO daily_reports (user_id, report_date, summary)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [req.user.id, date, summary]);

            res.status(201).json({
                message: 'Daily report submitted successfully.',
                report: result.rows[0]
            });
        }
    } catch (error) {
        console.error('Error submitting report:', error);
        res.status(500).json({ error: 'Failed to submit report.' });
    }
});

// GET /api/reports/check-today - Check if user submitted today's report
router.get('/check-today', authenticate, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const result = await pool.query(
            'SELECT id FROM daily_reports WHERE user_id = $1 AND report_date = $2',
            [req.user.id, today]
        );

        res.json({ submitted: result.rows.length > 0 });
    } catch (error) {
        console.error('Error checking report:', error);
        res.status(500).json({ error: 'Failed to check report status.' });
    }
});

// GET /api/reports/staff-summary - Get staff-wise report summary (Admin only)
router.get('/staff-summary', authenticate, isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.designation,
        COUNT(dr.id) as total_reports,
        MAX(dr.report_date) as last_report_date
      FROM users u
      LEFT JOIN daily_reports dr ON u.id = dr.user_id
      WHERE u.role = 'STAFF'
      GROUP BY u.id, u.name, u.email, u.designation
      ORDER BY u.name
    `);

        res.json({ summary: result.rows });
    } catch (error) {
        console.error('Error fetching staff summary:', error);
        res.status(500).json({ error: 'Failed to fetch staff summary.' });
    }
});

export default router;
