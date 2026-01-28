-- A3 Feature Schema Migration
-- Run this in your Neon database console

-- A3 Items Table --
CREATE TABLE IF NOT EXISTS a3_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed')),
    comment TEXT,
    completed_at TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- A3 Assignments (Many-to-Many: A3 <-> Staff) --
CREATE TABLE IF NOT EXISTS a3_assignments (
    id SERIAL PRIMARY KEY,
    a3_id INTEGER NOT NULL REFERENCES a3_items(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(a3_id, user_id)
);

-- If table already exists, add the new columns --
-- ALTER TABLE a3_items ADD COLUMN IF NOT EXISTS comment TEXT;
-- ALTER TABLE a3_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
