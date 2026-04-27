# 🚀 Quick Start - Deploy to Cloud (2 minutes)

**No local setup needed!** Get TollingLLM live online in just 2 minutes.

---

## Step 1: Sign Up on Railway.app (1 minute)

1. Go to [railway.app](https://railway.app)
2. Click "Start Project"
3. Sign up with **GitHub** (required)
4. Authorize Railway to access your GitHub account

---

## Step 2: Fork This Repository

1. Go to [github.com/YOUR_USERNAME/tolling-llm](https://github.com/YOUR_USERNAME/tolling-llm)
2. Click **Fork** button
3. Wait for fork to complete

---

## Step 3: Deploy to Railway (30 seconds)

1. Go back to [railway.app](https://railway.app)
2. Click **New Project**
3. Select **Deploy from GitHub Repo**
4. Select your forked `tolling-llm` repo
5. Click **Deploy**
6. Wait 2-3 minutes for build to complete

---

## Step 4: Configure Environment (1 minute)

Railway auto-detects `docker-compose.yml`. No config needed!

**But if you want custom settings:**

1. In Railway dashboard → Select `tolling-llm` project
2. Click **Variables** tab
3. Set these values:

```
NODE_ENV=production
MONGODB_URI=mongodb://admin:password@mongodb:27017/tolling_db
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=mistral
FRONTEND_URL=https://your-domain.com
```

4. Click Save → **Auto-redeploys!**

---

## ✅ Your App is Live!

**View it online:**
```
https://tolling-llm-xxxxx.railway.app
```

Replace `xxxxx` with your Railway project ID.

---

## 📝 Make Changes (Push & Auto-Deploy)

Every time you push to GitHub, it auto-deploys!

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/tolling-llm.git
cd tolling-llm

# Make changes to any file
nano backend/src/services/chatAgentService.ts

# Push to GitHub
git add .
git commit -m "My awesome change"
git push origin main

# 🎉 Automatically deploys to Railway in ~2 minutes!
```

---

## 🌐 Share Your Live App

```
Share this URL with everyone:
https://tolling-llm-xxxxx.railway.app

Features live online:
✅ Transaction management
✅ AI chat with Mistral
✅ CSV import/export
✅ Full MongoDB database
```

---

## 💰 Cost

**Totally free for testing!**

- MongoDB: Free (512MB)
- Ollama: Free (runs in container)
- Railway.app: $5/month (after free credits)

---

## 🐛 If Something Goes Wrong

### Check Logs
1. Railway dashboard → Project
2. Click **Logs** tab
3. See what's happening

### Common Issues

**"Build failed"**
- Check GitHub Actions logs
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

**"Port already in use"**
- Railway assigns ports automatically
- Not an issue for you

**"Can't reach database"**
- MongoDB container is starting
- Wait 30 seconds and refresh

---

## 🔧 Next Steps

### For Contributors
See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- How to add features
- Code style guidelines
- Pull request process

### For Customization
See [PRODUCTION.md](PRODUCTION.md) for:
- Custom domain setup
- Database configuration
- Advanced settings

---

## ✨ That's It!

You now have a **live, production-ready app** completely online.

**More complex setup?** See [PRODUCTION.md](PRODUCTION.md)

**Want to contribute?** See [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Questions?** Open an issue on GitHub 👆

---

Last Updated: April 2026
