import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

// GET /api/users/staff - Get all staff members (Admin only)
router.get('/staff', authenticate, isAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, designation, created_at 
       FROM users 
       WHERE role = 'STAFF' 
       ORDER BY created_at DESC`
        );
        res.json({ staff: result.rows });
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ error: 'Failed to fetch staff members.' });
    }
});

// POST /api/users - Create a new staff user (Admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const { name, email, password, designation } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        // Check if email already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already in use.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, designation) 
       VALUES ($1, $2, $3, 'STAFF', $4) 
       RETURNING id, name, email, designation, created_at`,
            [name, email, passwordHash, designation || null]
        );

        const newUser = result.rows[0];

        // Send welcome email (non-blocking)
        sendEmail({
            to: email,
            subject: 'Your Account Has Been Created',
            html: `
        <h2>Welcome to Task Management System</h2>
        <p>Hello ${name},</p>
        <p>Your account has been created by the administrator.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p>Please login and change your password.</p>
      `
        }).catch(err => console.error('Failed to send welcome email:', err));

        res.status(201).json({
            message: 'Staff member created successfully.',
            user: newUser
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user.' });
    }
});

// DELETE /api/users/:id - Delete a staff user (Admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists and is not admin
        const user = await pool.query(
            'SELECT role FROM users WHERE id = $1',
            [id]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (user.rows[0].role === 'ADMIN') {
            return res.status(403).json({ error: 'Cannot delete admin user.' });
        }

        await pool.query('DELETE FROM users WHERE id = $1', [id]);

        res.json({ message: 'User deleted successfully.' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

export default router;
