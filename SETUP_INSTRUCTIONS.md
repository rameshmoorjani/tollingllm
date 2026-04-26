# TollingLLM - Setup & Deployment Instructions

## What Changed?

✅ **Database (MongoDB)**: No changes - same as before  
✅ **Frontend (React)**: No changes - same as before  
✅ **Docker**: No changes - same configuration  
✅ **Tech Stack**: Kept identical (React + Node.js + MongoDB)

❌ **Removed**: AWS Bedrock (no longer needed)  
✅ **Added**: HuggingFace API (free tier, open-source Mistral model)

---

## Step 1: Get HuggingFace API Key (2 minutes)

1. Go to: https://huggingface.co
2. Sign up (free)
3. Go to: https://huggingface.co/settings/tokens
4. Click **"New token"**
5. Create token (copy it)

---

## Step 2: Set Environment Variable

### For Local Development:

**File: `.env` (project root)**
```env
HF_API_KEY=your_hf_token_here
```

Replace `your_hf_token_here` with your actual token from Step 1.

---

## Step 3: Run Locally

```bash
# Build and start Docker
docker-compose down
docker-compose up --build

# Wait for services to start (30-40 seconds)
```

**Check if running:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- MongoDB: localhost:27017

---

## Step 4: Test Chat Agent

1. Open **http://localhost:3000**
2. Go to **"Agent"** tab
3. Enter Customer ID: `CUST001`
4. Type query: "Summarize my transactions"
5. Click **Send**

✅ **Expected**: AI response in 5-10 seconds (first request slower)

---

## Production Deployment (Railway)

### Prerequisites:
- GitHub account
- HuggingFace API key (from Step 1)
- MongoDB Atlas account (free tier)

### Step A: Prepare Repository

```bash
# Initialize git
git init
git add .
git commit -m "TollingLLM ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tolling-llm.git
git push -u origin main
```

### Step B: Deploy on Railway

1. Go to: https://railway.app
2. Click **"Create Project"** → **"Deploy from Git"**
3. Select your `tolling-llm` repository
4. Railway auto-detects Docker setup

### Step C: Set Environment Variables

In Railway Dashboard:

1. Go to **Variables** tab
2. Add:
   ```
   HF_API_KEY=your_hf_token_here
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/tolling_db
   NODE_ENV=production
   ```

### Step D: Connect MongoDB

**Option 1: MongoDB Atlas (Recommended)**
1. Go to: https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Add to Railway: `MONGODB_URI`

**Option 2: Use Railway PostgreSQL**
- Railway manages it automatically
- Copy connection string to `MONGODB_URI`

### Step E: Deploy

Railway auto-deploys! Your app will be live at:
```
https://tolling-llm-xxxxx.railway.app
```

Share this URL with anyone - no installation needed!

---

## Cost Summary

| Component | Cost | Notes |
|-----------|------|-------|
| Railway | $5-10/mo | Backend + MongoDB |
| HuggingFace | FREE | 30k req/month free tier |
| Domain | FREE | Railway subdomain |
| **Total** | ~**$5-10/month** | Very affordable |

---

## Migration to AWS Bedrock (Future)

When you want to switch to AWS Bedrock later:

1. Just update **1 file**: `backend/src/services/sagemakerService.ts`
2. Replace HuggingFace API calls with AWS Bedrock calls
3. Add AWS credentials to `.env`
4. **Everything else stays the same** ✅

---

## Troubleshooting

### "Failed to process query" Error
- Check `HF_API_KEY` is set in `.env`
- Verify token is correct on https://huggingface.co/settings/tokens
- Check free tier hasn't exceeded 30k/month

### Slow Response (5-15 seconds)
- HuggingFace free tier has rate limits
- Normal behavior!
- Upgrade to Pro ($9/month) for faster inference

### MongoDB Connection Error
- Verify `MONGODB_URI` in Railway
- MongoDB Atlas: Whitelist `0.0.0.0/0` for Railway
- Check credentials are correct

### Docker Build Fails
```bash
# Clean and rebuild
docker system prune -a
docker-compose down
docker-compose up --build
```

---

## Useful URLs

| Service | URL |
|---------|-----|
| HF Tokens | https://huggingface.co/settings/tokens |
| MongoDB Atlas | https://www.mongodb.com/cloud/atlas |
| Railway | https://railway.app |
| Backend API Docs | http://localhost:5000/api/docs |

---

## Next Steps

1. ✅ Get HuggingFace API key
2. ✅ Set `HF_API_KEY` in `.env`
3. ✅ Test locally (`docker-compose up --build`)
4. ✅ Push to GitHub
5. ✅ Deploy on Railway
6. 🎉 Share production URL!

---

## Questions?

- HuggingFace Docs: https://huggingface.co/docs
- Railway Docs: https://docs.railway.app
- MongoDB Docs: https://docs.mongodb.com

Good luck! 🚀
