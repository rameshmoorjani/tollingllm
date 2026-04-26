# TollingLLM Production Deployment Guide

## Overview

TollingLLM is a full-stack application with:
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript  
- **Database**: MongoDB 7.0
- **LLM**: Ollama (free, open-source, runs locally)

This guide covers production deployment options.

---

## Option 1: Docker Deployment (Recommended for Quick Setup)

### Requirements
- Docker & Docker Compose
- 4GB+ RAM (for Ollama)
- 20GB+ disk space (includes models)

### Step 1: Configure Environment

```bash
# Copy production template
cp .env.production .env

# Edit with your production settings
nano .env  # or use your editor
```

**Critical settings:**
```bash
NODE_ENV=production
MONGODB_URI=mongodb://admin:YOUR_PASSWORD@mongodb:27017/tolling_db?authSource=admin
MONGO_ROOT_PASSWORD=YOUR_STRONG_PASSWORD
FRONTEND_URL=https://your-domain.com
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=mistral
```

### Step 2: Deploy Containers

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Verify all services are running
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Pull Ollama model (first run only, ~5 min)
docker exec tolling-llm-ollama ollama pull mistral
```

### Step 3: Initialize Database (first run)

```bash
# Import sample transactions
curl -X POST http://localhost:5000/api/transactions/import \
  -H "Content-Type: application/json" \
  -d @sample_transactions.json
```

### Step 4: Verify Deployment

```bash
# Test backend health
curl http://localhost:5000/api/health

# Open frontend
open http://localhost:3000
```

---

## Option 2: Cloud Deployment (Railway.app)

### Why Railway?
- ✅ Simple git-based deployment
- ✅ Free tier available
- ✅ $5-20/month production cost
- ✅ Automatic HTTPS
- ✅ Environment variables UI

### Step 1: Sign Up & Create Project

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project

### Step 2: Connect Repository

```bash
# Push code to GitHub
git init
git add .
git commit -m "TollingLLM production ready"
git remote add origin https://github.com/YOUR_USERNAME/tolling-llm.git
git branch -M main
git push -u origin main
```

Then in Railway:
1. Click "New Project" → "Deploy from GitHub repo"
2. Select your `tolling-llm` repo
3. Railway auto-detects `docker-compose.yml`

### Step 3: Configure Environment Variables

In Railway dashboard → Project settings → Variables:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/tolling_db
FRONTEND_URL=https://tolling-llm-xxxxx.railway.app
OLLAMA_HOST=http://host.docker.internal:11434
OLLAMA_MODEL=mistral
LOG_LEVEL=info
MONGO_ROOT_PASSWORD=your-secure-password
```

### Step 4: Database Setup

**Option A: MongoDB Atlas (Cloud)**
```bash
# Create free account at mongodb.com/cloud/atlas
# Create cluster (free tier: 512MB)
# Get connection string: mongodb+srv://user:pass@cluster.mongodb.net/tolling_db
# Set as MONGODB_URI in Railway
```

**Option B: Railway PostgreSQL**
```bash
# In Railway, add PostgreSQL service
# Use Railway's built-in MongoDB (if available)
# Update MONGODB_URI
```

### Step 5: Deploy

```bash
# Push to GitHub - Railway auto-deploys
git push

# View logs in Railway dashboard
# App live at: https://tolling-llm-xxxxx.railway.app
```

---

## Option 3: AWS/Google Cloud/Azure

### Using Docker with AWS ECS/Fargate

```bash
# Build and push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin YOUR_ECR_REGISTRY
docker build -f docker/Dockerfile.backend -t tolling-llm-backend .
docker tag tolling-llm-backend:latest YOUR_ECR_REGISTRY/tolling-llm-backend:latest
docker push YOUR_ECR_REGISTRY/tolling-llm-backend:latest

# Then deploy via AWS CloudFormation or Terraform
```

---

## Option 4: Self-Hosted Linux Server

### Requirements
- Ubuntu 20.04+ or CentOS 8+
- 4GB+ RAM
- 50GB+ storage
- Docker installed

### Setup Steps

```bash
# 1. SSH into server
ssh user@your-server-ip

# 2. Install dependencies
sudo curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Clone repository
git clone https://github.com/YOUR_USERNAME/tolling-llm.git
cd tolling-llm

# 4. Configure environment
cp .env.production .env
nano .env  # Edit with production values

# 5. Deploy
docker-compose -f docker-compose.prod.yml up -d

# 6. Setup reverse proxy (Nginx)
# See Nginx configuration section below
```

### Nginx Reverse Proxy (Recommended)

```nginx
# /etc/nginx/sites-available/tolling-llm
upstream backend {
    server localhost:5000;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    client_max_body_size 50M;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
# Install SSL certificate
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com

# Enable Nginx site
sudo ln -s /etc/nginx/sites-available/tolling-llm /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

---

## Production Best Practices

### 1. Security

```bash
# ✅ Use strong passwords
MONGO_ROOT_PASSWORD=$(openssl rand -base64 32)

# ✅ Enable HTTPS everywhere
FRONTEND_URL=https://your-domain.com

# ✅ Restrict MongoDB access
# - Use private networks
# - Enable authentication
# - Regular backups

# ✅ Rate limiting
# Add nginx rate limiting or API gateway
```

### 2. Monitoring & Logging

```bash
# View container logs
docker-compose logs -f backend

# Log aggregation services (optional)
# - Datadog
# - New Relic
# - AWS CloudWatch
# - ELK Stack
```

### 3. Backups

```bash
# Backup MongoDB
docker exec tolling-llm-mongodb \
  mongodump --uri "mongodb://admin:password@localhost:27017/tolling_db?authSource=admin" \
  --out /backup

# Backup to S3
aws s3 sync ./backup s3://your-bucket/tolling-llm-backup/
```

### 4. Scaling

**For high traffic:**
```yaml
# Use load balancer (nginx/HAProxy)
# Multiple backend instances
# MongoDB replica set
# Separate Ollama server for LLM
# Redis for caching
# CDN for frontend assets
```

### 5. Performance

```bash
# Monitor resource usage
docker stats

# Typical production sizing:
# - MongoDB: 2GB+ storage
# - Backend: 512MB RAM + 512MB swap
# - Frontend: 256MB (static)
# - Ollama: 4GB+ RAM + 10GB storage

# Database indexing
# Implement pagination for large datasets
# Cache frequently accessed data
```

---

## Troubleshooting

### MongoDB Connection Failed

```bash
# Verify MongoDB is running
docker-compose -f docker-compose.prod.yml ps mongodb

# Check credentials
docker exec tolling-llm-mongodb mongosh -u admin -p password

# Review connection string
echo $MONGODB_URI
```

### Ollama Not Responding

```bash
# Check if Ollama container is running
docker ps | grep ollama

# Verify model is loaded
curl http://localhost:11434/api/tags

# Pull model if missing
docker exec tolling-llm-ollama ollama pull mistral
```

### High Memory Usage

```bash
# Reduce Ollama model size
OLLAMA_MODEL=neural-chat  # 4GB instead of 5GB

# Or run Ollama on separate server
OLLAMA_HOST=http://ollama-server:11434
```

---

## Migration Checklist

- [ ] Database credentials configured
- [ ] SSL/HTTPS enabled
- [ ] Environment variables set
- [ ] Sample data imported
- [ ] Health checks passing
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Domain/DNS configured
- [ ] Rate limiting configured
- [ ] Team access configured

---

## Support & Resources

- **Docker Docs**: https://docs.docker.com
- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **Railway Docs**: https://docs.railway.app
- **Ollama**: https://ollama.ai

---

## Cost Estimate (Monthly)

| Service | Free Tier | Paid |
|---------|-----------|------|
| Railway.app | $5 | $5-20 |
| MongoDB Atlas | 512MB | $0 (shared) |
| Ollama | Free (local) | Free |
| **Total** | **Free** | **$5-20** |

---

Last Updated: April 2026
