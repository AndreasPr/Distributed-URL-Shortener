# 🚀 Deployment Guide: Vercel + Railway + Managed Services

This guide covers deploying the Distributed URL Shortener to production using Vercel (frontend), Railway (backend + database), and managed services.

---

## 📋 Prerequisites

- [Vercel Account](https://vercel.com) ✅ (you have this)
- [Railway Account](https://railway.app) (free tier available)
- [Redis Cloud Account](https://redis.com/cloud) OR [Upstash Account](https://upstash.com) (free tier available)
- GitHub repository with your code pushed

---

## 🎯 Architecture

```
┌─────────────────────────┐
│   Vercel (Frontend)     │  Next.js app running at: your-app.vercel.app
│   (localhost:3000)      │
└────────────┬────────────┘
             │ API calls
             ↓
┌─────────────────────────┐
│ Railway (Backend)       │  FastAPI app running at: your-api.up.railway.app
│ (localhost:8000)        │
└────────────┬────────────┘
             │ queries
             ↓
┌─────────────────────────┐     ┌──────────────────────┐
│ Railway PostgreSQL      │     │ Redis Cloud/Upstash  │
│ (managed)               │     │ (managed)            │
└─────────────────────────┘     └──────────────────────┘
```

---

## 📦 Step 1: Deploy Frontend to Vercel

### 1.1 Connect GitHub Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Select the repository containing the URL Shortener project
5. Vercel will auto-detect it's a Next.js project

### 1.2 Configure Build Settings

In the Vercel import dialog:
- **Framework Preset**: Next.js
- **Root Directory**: `./frontend`
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 1.3 Set Environment Variables

1. In the import dialog, click **"Environment Variables"**
2. Add:
   ```
   NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
   ```
   (We'll set the actual backend URL after deploying the backend)

3. Click **"Deploy"**

Vercel will now build and deploy your frontend. Once complete, you'll get a URL like: `https://your-project.vercel.app`

---

## 🚂 Step 2: Deploy Backend to Railway

### 2.1 Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"Create New Project"** or **"New"**
3. Select **"Deploy from GitHub repo"**
4. Connect and select your repository

### 2.2 Configure Railway Build

Railway should auto-detect the Python project. Configure:
- **Root Directory**: `/` (root of repo)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

This is already defined in the `Procfile` included in the project, so Railway should use it automatically.

### 2.3 Add PostgreSQL Service

1. In your Railway project, click **"Create"** → **"Database"** → **"PostgreSQL"**
2. Railway will automatically:
   - Create a PostgreSQL instance
   - Set environment variables: `DATABASE_URL`

### 2.4 Configure Environment Variables

In Railway project settings, add these environment variables:

```
# Database (auto-set by Railway PostgreSQL plugin)
DATABASE_URL=postgresql://[auto-filled]

# Redis
REDIS_URL=redis://[your-redis-host]:[port]/0

# FastAPI
ENVIRONMENT=production
LOG_LEVEL=info
```

### 2.5 Deploy

Railway will automatically deploy on push to your main branch. Monitor the deployment in the Railway dashboard.

Once deployed, you'll get a URL like: `https://your-api.up.railway.app`

---

## 🔴 Step 3: Set Up Redis

### Option A: Redis Cloud (Recommended)

1. Go to [Redis Cloud](https://redis.com/cloud)
2. Create a free account and database
3. Note your connection string: `redis://:[password]@[host]:[port]`
4. Add to Railway environment variables:
   ```
   REDIS_URL=redis://:[password]@[host]:[port]/0
   ```

### Option B: Upstash

1. Go to [Upstash Console](https://console.upstash.com)
2. Create a free Redis database
3. Copy the connection string (Redis CLI)
4. Add to Railway environment variables:
   ```
   REDIS_URL=redis://:[password]@[host]:[port]
   ```

---

## 🔗 Step 4: Connect Frontend to Backend

### 4.1 Get Backend URL

Once backend is deployed on Railway, copy the deployment URL. It will look like:
```
https://your-api-production.up.railway.app
```

### 4.2 Update Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_API_URL`:
   ```
   NEXT_PUBLIC_API_URL=https://your-api-production.up.railway.app
   ```
3. Vercel will automatically redeploy with the new value

### 4.3 Enable CORS in Backend

The backend already has CORS configured in `app/main.py` to allow:
- `http://localhost:3000-3003` (local development)
- You may need to add your Vercel domain

Update [app/main.py](../app/main.py) if needed:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "https://your-project.vercel.app",  # Add your Vercel domain
    ],
    ...
)
```

---

## ✅ Step 5: Verify Deployment

### Test Frontend

1. Visit: `https://your-project.vercel.app`
2. You should see the URL Shortener dashboard
3. Test the form: shorten a URL
4. Check if data appears (indicates backend connection works)

### Test Backend Health Check

```bash
curl https://your-api-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "db": "reachable",
  "redis": "reachable",
  "dbsize": 0,
  "total_urls": 0
}
```

### Test Analytics

1. Create a short URL in the frontend
2. Navigate to `/analytics` page
3. Search for the short code
4. Verify data is displayed

---

## 🔧 Environment Variables Summary

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://your-api-production.up.railway.app
```

### Backend (Railway)
```
# Database (auto-set by Railway PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/dbname

# Redis
REDIS_URL=redis://:[password]@[host]:[port]/0

# Application
ENVIRONMENT=production
LOG_LEVEL=info
```

---

## 🚨 Troubleshooting

### Frontend shows "Failed to fetch"
- Check `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- Verify backend is running: `curl https://your-api-production.up.railway.app/health`
- Check CORS configuration in backend

### Backend crashes on startup
- Check PostgreSQL connection: `DATABASE_URL` environment variable
- Check Redis connection: `REDIS_URL` environment variable
- View Railway logs: Dashboard → Logs tab

### Database data not persisting
- Ensure Railway PostgreSQL database is running
- Check `DATABASE_URL` is correct
- Verify migrations have run (if applicable)

### Slow response times
- Check Railway CPU/Memory: Dashboard → Metrics
- Consider upgrading Railway plan
- Enable Redis caching (already implemented)

---

## 📈 Monitoring & Logs

### Vercel Logs
- Dashboard → Your Project → **Deployments** → View Logs

### Railway Logs
- Dashboard → Your Project → **Logs** tab
- Filter by service (API, PostgreSQL, etc.)

### Check API Health
```bash
curl https://your-api-production.up.railway.app/health/redis
```

---

## 💰 Cost Estimates (May 2024)

| Service | Free Tier | Notes |
|---------|-----------|-------|
| **Vercel** | ✅ Yes | Up to 100 deployments/month, 6GB bandwidth |
| **Railway** | ✅ Yes | $5 free credits/month, pay-as-you-go after |
| **PostgreSQL (Railway)** | ✅ Yes | Included in free credits |
| **Redis Cloud** | ✅ Yes | 30MB free, limited commands |
| **Upstash** | ✅ Yes | 10k requests/day free |

---

## 🎉 Success Checklist

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway
- [ ] PostgreSQL database created on Railway
- [ ] Redis instance created (Cloud/Upstash)
- [ ] Environment variables set on both platforms
- [ ] Frontend can reach backend API
- [ ] Dashboard page loads with data
- [ ] Create short URL works end-to-end
- [ ] Analytics page shows data
- [ ] Health check endpoint responds

---

## 📚 Additional Resources

- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Redis Cloud Docs](https://docs.redis.com/latest/rc/)
- [Upstash Docs](https://upstash.com/docs)

---

## 🔐 Security Notes

- Never commit `.env.local` or environment variables to GitHub
- Use Railway environment variables for secrets
- Enable authentication on Redis (already configured)
- Use HTTPS for all production URLs
- Regularly rotate database passwords
