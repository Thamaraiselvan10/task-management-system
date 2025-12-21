import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seed() {
    console.log('🌱 Starting database seed...');

    try {
        // Check if admin already exists
        const existingAdmin = await pool.query(
            "SELECT id FROM users WHERE email = 'admin@kiot'"
        );

        if (existingAdmin.rows.length > 0) {
            console.log('ℹ️  Admin user already exists, skipping seed.');
            return;
        }

        // Hash the admin password: kiot@168
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('kiot@168', salt);

        // Insert admin user
        await pool.query(`
      INSERT INTO users (name, email, password_hash, role, designation)
      VALUES ($1, $2, $3, $4, $5)
    `, ['Admin', 'admin@kiot', passwordHash, 'ADMIN', 'Director']);

        console.log('✅ Admin user created successfully!');
        console.log('   Email: admin@kiot');
        console.log('   Password: kiot@168');

    } catch (error) {
        console.error('❌ Seed failed:', error.message);
    } finally {
        await pool.end();
    }
}

seed();
