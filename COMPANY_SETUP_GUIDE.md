# TollingLLM - Company Setup Guide

Complete step-by-step instructions to build and deploy TollingLLM for your company project.

## Overview
TollingLLM is an AI-powered tolling transaction analysis system using:
- **Frontend:** React 18 + Vite + TypeScript + Socket.IO
- **Backend:** Node.js 18 + Express + TypeScript + Socket.IO
- **Database:** MongoDB 7.0
- **AI:** AWS Bedrock (Llama 3 or Mistral models)
- **Cloud:** AWS EC2 + Docker + Docker Compose

---

## Phase 1: Prerequisites & Setup (1-2 hours)

### 1.1 AWS Account Setup
1. Create/Use AWS Account
2. Create IAM User for the application:
   - Go to **IAM** → **Users** → **Create user**
   - Attach policy: **AmazonBedrockFullAccess**
   - Create Access Key (save AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY)
3. Choose AWS Region (recommended: **us-east-1** for Bedrock availability)
4. Enable Bedrock in your region:
   - Go to **Bedrock** → **Model access**
   - Models are auto-enabled for on-demand use

### 1.2 Local Development Environment
```bash
# Install required tools
- Node.js 18+ (https://nodejs.org/)
- Docker & Docker Compose (https://www.docker.com/)
- Git (https://git-scm.com/)
- MongoDB Compass (optional, for DB visualization)

# Verify installations
node --version    # v18.x or higher
npm --version     # 9.x or higher
docker --version  # 20.x or higher
```

### 1.3 Create Project Repository
```bash
git clone <your-repo-url>
cd TollingLLM
```

---

## Phase 2: Local Development Setup (2-3 hours)

### 2.1 Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0
MONGODB_URI=mongodb://localhost:27017/tollingllm
NODE_ENV=development
PORT=5000
EOF

# Build TypeScript
npm run build

# Test locally
npm start
```

### 2.2 Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Create public/config.js for environment
cat > public/config.js << EOF
window.API_URL = 'http://localhost:5000';
window.SOCKET_URL = 'http://localhost:5000';
EOF

# Build
npm run build

# Test locally
npm run dev
```

### 2.3 Local Docker Setup
```bash
# From project root
docker-compose up -d

# Verify containers
docker-compose ps

# Check logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
```

**Test locally:** Visit `http://localhost:3000`

---

## Phase 3: AWS EC2 Deployment (2-3 hours)

### 3.1 Create EC2 Instance
1. Go to **AWS EC2** → **Launch Instance**
2. **AMI:** Amazon Linux 2 or Ubuntu 22.04
3. **Instance Type:** t3.micro (free tier eligible)
4. **Security Group:** Allow ports 80, 443, 5000, 3000
5. **Key Pair:** Create and download `.pem` file
6. **Launch** → Note public IP address

### 3.2 Install EC2 Dependencies
```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Install Docker
sudo yum update -y
sudo yum install -y docker git
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for local builds)
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 3.3 Deploy Application
```bash
# Clone repository on EC2
git clone <your-repo-url>
cd TollingLLM

# Create docker-compose.yml with environment variables
cat > .env << EOF
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0
FRONTEND_URL=http://YOUR_EC2_IP:3000
MONGODB_URI=mongodb://tolling-llm-mongodb:27017/tollingllm
NODE_ENV=production
EOF

# Start containers
docker-compose up -d --build

# Verify
docker-compose logs backend
```

**Test deployment:** Visit `http://YOUR_EC2_IP:3000`

---

## Phase 4: AWS Bedrock Configuration (1-2 hours)

### 4.1 Bedrock Model Selection
**Recommended Models:**
- **Mistral 7B** (fastest, best rate limits)
  - Model ID: `mistral.mistral-7b-instruct-v0:2`
  - Cost: ~$0.00015/input token, ~$0.0006/output token
  
- **Llama 3 8B** (capable, good balance)
  - Model ID: `meta.llama3-8b-instruct-v1:0`
  - Cost: ~$0.00015/input token, ~$0.0006/output token

### 4.2 Bedrock Quotas
**Free Tier Limits:**
- 100K input tokens/day
- 100K output tokens/day
- Resets daily at midnight UTC

**Upgrade to On-Demand:**
1. Go to **Service Quotas** → **Amazon Bedrock**
2. Click **Request quota increase**
3. Set quota to 5,000,000 (TPM)
4. AWS approves in 1-2 hours
5. Automatic switch from free to on-demand pricing

---

## Phase 5: Database Setup (30 minutes)

### 5.1 MongoDB Configuration
```bash
# MongoDB is started via Docker Compose
# Connection string: mongodb://tolling-llm-mongodb:27017/tollingllm

# Create database and collections
docker-compose exec tolling-llm-mongodb mongosh

# In mongo shell
use tollingllm

# Create sample transaction data
db.transactions.insertMany([
  {
    customerId: "CUST001",
    amount: 15.50,
    tollBooth: "Toll Booth 7 - Turnpike",
    timestamp: new Date("2026-05-01"),
    location: "Turnpike"
  },
  {
    customerId: "CUST001",
    amount: 12.75,
    tollBooth: "Toll Booth 5 - Highway 101",
    timestamp: new Date("2026-04-28"),
    location: "Highway 101"
  }
])

exit
```

---

## Phase 6: Features Configuration (1-2 hours)

### 6.1 Response Caching
**Enabled by default** with 1-hour TTL
- Reduces Bedrock API calls
- Cache key: MD5(customerId + query + transactionCount)
- Location: In-memory cache in chatAgentService

### 6.2 Request Queueing
**Prevents concurrent rate limiting:**
- Sequential processing (1 request at a time)
- 1-second minimum between requests
- Prevents API overwhelming

### 6.3 Retry Strategy
**Current configuration:**
```typescript
// No retries (conserves tokens)
maxRetries = 0

// Change if needed:
maxRetries = 2  // Allow 1 retry
maxRetries = 5  // Allow up to 5 retries
```

**When to adjust:**
- High quota: Use more retries (5-15)
- Limited quota: Use fewer retries (0-2)

---

## Phase 7: Socket.IO Configuration (30 minutes)

### 7.1 WebSocket Setup
**Backend listens on:** `http://0.0.0.0:5000`
**Frontend connects to:** EC2 public IP

**Critical events:**
```javascript
// Backend emits:
socket.emit('agent_complete', { message: "AI response" })
socket.emit('agent_error', { error: "Error message" })

// Frontend listens:
socket.on('agent_complete', (data) => { /* handle response */ })
socket.on('agent_error', (data) => { /* handle error */ })
socket.on('agent_timeout', () => { /* handle timeout */ })
```

### 7.2 CORS Configuration
**Already configured** for cross-IP connections:
```typescript
cors: {
  origin: "*",  // Allow all origins (configurable)
  methods: ["GET", "POST"]
}
```

---

## Phase 8: Monitoring & Logging (1 hour)

### 8.1 Backend Logs
```bash
# View real-time logs
docker-compose logs -f backend

# Check for errors
docker-compose logs backend | grep -i error

# Check Bedrock calls
docker-compose logs backend | grep -i bedrock
```

### 8.2 CloudWatch Monitoring
1. Go to **CloudWatch** → **Metrics**
2. Search for "Bedrock"
3. Monitor:
   - InputTokenCount
   - OutputTokenCount
   - InvocationLatency
   - InvocationClientErrors

### 8.3 AWS Billing Alerts
```bash
# Set up budget alert
AWS Console → Budgets → Create budget
- Set limit: $10/month
- Alert when 80% reached
```

---

## Phase 9: Production Optimization (2-3 hours)

### 9.1 Performance Tuning
```bash
# Reduce prompt size (token optimization)
# Current: ~225 characters
# Goal: <150 characters

# Adjust retry strategy based on quota
# Free tier: maxRetries = 0
# Paid tier: maxRetries = 3-5

# Increase cache TTL for repeated queries
# Current: 1 hour
# Consider: 4-8 hours for production
```

### 9.2 Security Hardening
```bash
# 1. Rotate AWS credentials monthly
# 2. Enable MFA on AWS account
# 3. Use IAM roles instead of access keys
# 4. Enable CloudTrail logging
# 5. Set up VPC security groups:
#    - Port 5000: Backend API
#    - Port 3000: Frontend (via HTTPS)
#    - Port 27017: MongoDB (internal only)
```

### 9.3 Database Backup
```bash
# Scheduled MongoDB backup
docker-compose exec tolling-llm-mongodb mongodump --out /backup

# Enable AWS RDS for managed MongoDB alternative
```

---

## Phase 10: CI/CD Pipeline (Optional, 2-3 hours)

### 10.1 GitHub Actions Setup
```yaml
# .github/workflows/deploy.yml
name: Deploy to EC2
on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to EC2
        run: |
          ssh -i ${{ secrets.EC2_KEY }} ec2-user@${{ secrets.EC2_IP }} \
            'cd tollingllm && git pull && docker-compose up -d --build'
```

### 10.2 Automated Testing
```bash
# Add to package.json
"test": "jest",
"test:integration": "npm run test -- --testPathPattern=integration"

# Run tests before deployment
npm test && npm run build && docker-compose up -d
```

---

## Troubleshooting Guide

### Issue: "Too many tokens per day" error
**Solution:**
1. Check if free tier quota exhausted (100K/day limit)
2. Wait for daily reset (midnight UTC)
3. OR request quota increase (see Phase 4.2)

### Issue: WebSocket disconnection
**Solution:**
1. Verify FRONTEND_URL matches EC2 public IP
2. Check security group allows port 5000
3. Restart backend: `docker-compose restart backend`

### Issue: Bedrock API returns 403
**Solution:**
1. Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
2. Confirm IAM user has AmazonBedrockFullAccess
3. Check chosen model is available in region

### Issue: MongoDB connection timeout
**Solution:**
1. Verify MongoDB container is running: `docker-compose ps`
2. Check MONGODB_URI in .env file
3. Restart MongoDB: `docker-compose restart mongodb`

---

## Cost Estimation

### Free Tier (100K tokens/day)
- **Cost:** $0
- **Limitation:** Daily limit resets midnight
- **Use case:** Testing only

### On-Demand (Paid)
- **Per query cost:** ~$0.10-$0.20
  - Mistral 7B: Cheapest
  - Llama 3 8B: Balanced
  - Claude: Most expensive
- **EC2 t3.micro:** Free tier eligible
- **Estimated monthly:** $0-$50 depending on usage

---

## Deployment Checklist

- [ ] AWS account created with IAM user
- [ ] EC2 instance running (t3.micro)
- [ ] Docker & Docker Compose installed
- [ ] Repository cloned to EC2
- [ ] Environment variables configured (.env)
- [ ] MongoDB initialized with sample data
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Bedrock model selected and enabled
- [ ] WebSocket connection working
- [ ] CloudWatch monitoring enabled
- [ ] Budget alert set to $10-20/month

---

## Next Steps for Production

1. **Domain & HTTPS:** Set up custom domain with Route 53
2. **Load Balancer:** Add ALB for scalability
3. **Auto-scaling:** Configure ASG for high traffic
4. **Database:** Migrate to AWS RDS (managed MongoDB)
5. **CDN:** Use CloudFront for frontend caching
6. **Monitoring:** Set up DataDog/NewRelic alerts
7. **Compliance:** Enable encryption at rest/transit

---

## Support & References

- **Bedrock Documentation:** https://docs.aws.amazon.com/bedrock/
- **Socket.IO Guide:** https://socket.io/docs/
- **Express.js API:** https://expressjs.com/
- **React Documentation:** https://react.dev/
- **MongoDB Manual:** https://docs.mongodb.com/

---

## Contact
For questions or issues, refer to the project's GitHub issues or contact the development team.

**Last Updated:** May 2, 2026
**Version:** 1.0
