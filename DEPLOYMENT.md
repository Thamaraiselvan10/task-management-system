# 🚀 Deployment Guide - KIOT Task Manager

## Overview
- **Frontend** (React) → Vercel
- **Backend** (Node.js) → Render
- **Database** (PostgreSQL) → Neon.tech (already set up)

---

## Step 1: Push to GitHub

```bash
cd "e:\Developer\Full stack projects\task_&_work_management_system"
git init
git add .
git commit -m "KIOT Task Manager - Ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kiot-task-manager.git
git push -u origin main
```

---

## Step 2: Deploy Backend to Render.com

1. Go to [render.com](https://render.com) → Sign up with GitHub
2. Click **"New +" → "Web Service"**
3. Connect your GitHub repository
4. Configure:
   | Setting | Value |
   |---------|-------|
   | **Name** | `kiot-task-manager-api` |
   | **Root Directory** | `server` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |

5. Add **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Your Neon.tech connection string |
   | `JWT_SECRET` | Your secret key (e.g., `kiot-secret-2024`) |
   | `NODE_ENV` | `production` |
   | `CLIENT_URL` | `https://your-vercel-app.vercel.app` (update after Vercel deploy) |

6. Click **"Create Web Service"**
7. Wait for deployment → Copy your URL (e.g., `https://kiot-task-manager-api.onrender.com`)

---

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **"Add New" → "Project"**
3. Import your GitHub repository
4. Configure:
   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | Vite |
   | **Root Directory** | `client` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

5. Add **Environment Variable**:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | Your Render URL (e.g., `https://kiot-task-manager-api.onrender.com`) |

6. Click **"Deploy"**
7. Your app is live! 🎉

---

## Step 4: Update Render CORS

After getting your Vercel URL, go back to Render and update:
- `CLIENT_URL` = Your Vercel URL (e.g., `https://kiot-task-manager.vercel.app`)

---

## Testing

1. Visit your Vercel URL
2. Login with admin credentials: `admin@kiot` / `kiot@168`
3. Test all features

---

## Troubleshooting

### "Failed to fetch" errors
- Check that `VITE_API_URL` in Vercel matches your Render URL exactly
- Make sure Render's `CLIENT_URL` matches your Vercel URL

### Database connection issues
- Verify `DATABASE_URL` in Render is correct
- Check Neon.tech dashboard for connection status

### Login not working
- Make sure `JWT_SECRET` is set in Render
- Check Render logs for error messages
