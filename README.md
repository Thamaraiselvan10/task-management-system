# Task & Work Management System

A complete task and work management application for college administration. Built with React, Express, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (or use [Neon](https://neon.tech) for free cloud PostgreSQL)

### 1. Setup Database

Create a PostgreSQL database and run the schema :

```sql
-- Copy contents from server/src/db/schema.sql
```

Or use a cloud provider like **Neon** (recommended for Vercel deployment):
1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Run `schema.sql` in the SQL Editor

### 2. Setup Backend

```bash
cd server
npm install

# Create .env file
cp .env.example .env

# Update .env with your database URL:
# DATABASE_URL=postgresql://user:pass@host/db
# JWT_SECRET=your-secret-key
```

Seed the admin user:
```bash
npm run seed
```

Start the server:
```bash
npm run dev
```

### 3. Setup Front-end

```bash
cd client
npm install
npm run dev
```

### 4. Access the Application

Open http://localhost:5173

**Admin Login:**
- Email: `admin@kiot`
- Password: `kiot@168`

---

## 📁 Project Structure

```
├── server/               # Express Backend
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── db/           # Schema & seed scripts
│   │   ├── middleware/   # Auth middleware
│   │   ├── routes/       # API routes
│   │   ├── utils/        # Email helper
│   │   └── index.js      # Entry point
│   └── package.json
│
├── client/               # React Frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── context/      # Auth context
│   │   ├── pages/        # Page components
│   │   └── main.jsx      # Entry point
│   └── package.json
```

---

## 🔐 User Roles

| Feature | Admin | Staff |
|---------|-------|-------|
| Create Tasks | ✅ | ❌ |
| Assign Tasks | ✅ | ❌ |
| Create Staff | ✅ | ❌ |
| View All Tasks | ✅ | ❌ |
| View Assigned Tasks | - | ✅ |
| Update Task Status | ✅ | ✅ |
| Submit Daily Report | - | ✅ |
| View Reports | ✅ | ❌ |

---

## 🌐 Deployment (Vercel)

### Frontend (Vercel)
1. Push code to GitHub
2. Import repository in Vercel
3. Set root directory to `client`
4. Add environment variable: `VITE_API_URL=https://your-backend.com`

### Backend (Render.com recommended)
1. Create Web Service on Render
2. Connect GitHub repository
3. Set root directory to `server`
4. Add environment variables from `.env.example`

---

## 📝 API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `GET /api/users/staff` - List staff
- `POST /api/users` - Create staff
- `DELETE /api/users/:id` - Delete staff

### Tasks
- `GET /api/tasks` - List tasks (filtered by role)
- `POST /api/tasks` - Create task (Admin)
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task (Admin)
- `GET /api/tasks/stats/overview` - Get stats (Admin)

### Reports
- `GET /api/reports` - List reports
- `POST /api/reports` - Submit daily report
- `GET /api/reports/check-today` - Check if submitted today
