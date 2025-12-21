import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function resetAdmin() {
    console.log('🔧 Resetting admin password...');

    try {
        // Hash the password: kiot@168
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('kiot@168', salt);

        // Update or insert admin
        const result = await pool.query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE email = 'admin@kiot'
      RETURNING id, email
    `, [passwordHash]);

        if (result.rows.length > 0) {
            console.log('✅ Admin password updated successfully!');
            console.log('   Email: admin@kiot');
            console.log('   Password: kiot@168');
        } else {
            // Admin doesn't exist, create it
            await pool.query(`
        INSERT INTO users (name, email, password_hash, role, designation)
        VALUES ($1, $2, $3, $4, $5)
      `, ['Admin', 'admin@kiot', passwordHash, 'ADMIN', 'Director']);

            console.log('✅ Admin user created successfully!');
            console.log('   Email: admin@kiot');
            console.log('   Password: kiot@168');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

resetAdmin();
