# TollingLLM - Production Deployment Guide

## Quick Start (Development)

### 1. Get HuggingFace API Key
1. Go to https://huggingface.co/settings/tokens
2. Create a **new token** (read-only is fine)
3. Copy the token

### 2. Set Environment Variables
Update `.env` file in project root:
```env
HF_API_KEY=your_copied_token_here
```

Or for Docker, update before running:
```bash
export HF_API_KEY=your_token_here
docker-compose up --build
```

### 3. Run Locally
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start Docker
cd ..
docker-compose up --build
```

Access application: **http://localhost:3000**

---

## Production Deployment (Railway)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: TollingLLM"
git branch -M main
git remote add origin https://github.com/yourusername/tolling-llm.git
git push -u origin main
```

### Step 2: Create Railway Project
1. Go to https://railway.app
2. Click **"New Project"** → **"Deploy from Git"**
3. Select your **tolling-llm** repository
4. Railway auto-detects Docker setup

### Step 3: Add Environment Variables
In Railway Dashboard → **Variables**:
```env
HF_API_KEY=your_huggingface_api_key_here
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=production
```

### Step 4: MongoDB Setup
**Option A: Use MongoDB Atlas (Recommended)**
1. Sign up at https://www.mongodb.com/cloud/atlas (free tier available)
2. Create cluster
3. Get connection string: `mongodb+srv://user:password@cluster.mongodb.net/tolling_db`
4. Add to Railway **MONGODB_URI** variable

**Option B: Use Railway PostgreSQL/MySQL**
- Railway offers managed MongoDB alternative
- Add to Railway, get connection string

### Step 5: Deploy
Railway auto-deploys on GitHub push! Your app will be live at:
```
https://tolling-llm-production-xxxxx.railway.app
```

---

## Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| **Railway** | $5-10/month | Includes backend + MongoDB |
| **HuggingFace API** | FREE | 30,000 requests/month free tier |
| **Domain (optional)** | $0-12/year | Use Railway subdomain for free |
| **Total** | ~$5-10/month | Very cost-efficient |

---

## Migration to AWS Bedrock (Future)

When you want to switch to AWS Bedrock:

1. **Install AWS SDK:**
   ```bash
   npm install aws-sdk --save
   ```

2. **Replace 1 file** - `backend/src/services/sagemakerService.ts`
   - Swap HuggingFace API calls → AWS Bedrock calls
   - Update `.env` with AWS credentials

3. **No other changes needed:**
   - Database: Unchanged
   - Frontend: Unchanged
   - Docker: Unchanged
   - Deployment: Same Railway setup

---

## Troubleshooting

### Chat Agent Returns Error
1. Verify `HF_API_KEY` is set in `.env`
2. Check HuggingFace account has API access
3. Ensure free tier quota not exceeded (30k/month)

### Slow Response Time
- HuggingFace free tier has rate limiting
- Response time: 5-10 seconds (normal)
- Upgrade to Pro tier for faster inference (~$9/month)

### MongoDB Connection Error
- Verify `MONGODB_URI` in Railway variables
- Check firewall allows Railway IP addresses
- MongoDB Atlas: Add 0.0.0.0/0 to IP whitelist

---

## Accessing the Application

### Local Development
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/api/docs

### Production (Railway)
- Replace `localhost:3000` with Railway URL
- Everything else works the same
- SSL/HTTPS: Automatic

---

## Environment Variables Summary

| Variable | Value | Source |
|----------|-------|--------|
| `HF_API_KEY` | Hugging Face token | https://huggingface.co/settings/tokens |
| `MONGODB_URI` | MongoDB connection | MongoDB Atlas or Railway |
| `NODE_ENV` | `production` | Railway |
| `API_PORT` | `5000` | Docker (auto-assigned by Railway) |
| `FRONTEND_URL` | Railroad URL | Auto-detected |

---

## Support & Next Steps

1. **Need more requests?** → Upgrade HuggingFace Pro ($9/month)
2. **Want faster inference?** → Use AWS Bedrock (single file change)
3. **Scale to 1M users?** → Migrate to AWS Lambda + CloudFront

For questions, refer to:
- HuggingFace Docs: https://huggingface.co/docs
- Railway Docs: https://docs.railway.app
- MongoDB Atlas: https://docs.atlas.mongodb.com
