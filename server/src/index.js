import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import reportRoutes from './routes/reports.js';
import a3Routes from './routes/a3.js';
import pool from './config/db.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = [clientUrl, 'http://localhost:5174'];

console.log('🔒 CORS configured for origins:', allowedOrigins);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || origin === clientUrl) {
            callback(null, true);
        } else {
            console.log('Origin not allowed:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', message: 'Server is running', database: 'connected' });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/a3', a3Routes);

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
