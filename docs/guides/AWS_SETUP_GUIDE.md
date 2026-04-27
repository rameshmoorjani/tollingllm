# AWS Bedrock Setup Guide for TollingLLM

## Step 1: Create AWS Account (if you don't have one)
1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Enter email and password
4. Complete account setup and payment method verification

---

## Step 2: Get AWS Credentials

### Option A: Using Root Account (Quick, NOT RECOMMENDED for production)
1. Log in to AWS Console: https://console.aws.amazon.com
2. Go to **Account** (top-right) → **Security Credentials**
3. Expand "Access keys" section
4. Click "Create access key"
5. Copy:
   - **Access Key ID** → `AWS_ACCESS_KEY_ID`
   - **Secret Access Key** → `AWS_SECRET_ACCESS_KEY`

### Option B: Using IAM User (RECOMMENDED - Secure)
1. Log in to AWS Console
2. Go to **IAM** (search in top bar)
3. Click **Users** → **Create user**
   - User name: `tollingllm-app` (or any name)
   - Click **Next**
4. Click **Attach policies directly**
5. Search for and select:
   - ✅ `AmazonBedrockFullAccess` (for Bedrock)
   - ✅ `AmazonBedrockAgentFullAccess` (optional, for agents)
6. Click **Next** → **Create user**
7. Click on the new user name
8. Go to **Security credentials** tab
9. Click **Create access key**
10. Choose "Application running outside AWS" → **Next**
11. Click **Create access key**
12. Copy both keys **immediately** (can only see once):
    - **Access Key ID** → `AWS_ACCESS_KEY_ID`
    - **Secret Access Key** → `AWS_SECRET_ACCESS_KEY`

---

## Step 3: Get AWS Region

**Your region options:** (choose closest to you or your company)

```
us-east-1          (N. Virginia - most models available) ✅ RECOMMENDED
us-west-2          (Oregon)
eu-west-1          (Ireland)
ap-southeast-1     (Singapore)
```

**Default for this guide:** `us-east-1`

---

## Step 4: Enable Bedrock Models

1. Log in to AWS Console
2. Go to **Bedrock** (search in top bar)
3. Left sidebar → **Model access**
4. Click **Manage model access**
5. Check these models:
   - ✅ **Llama 3.1 8B Instruct** (RECOMMENDED - $0.15/1M tokens, fastest)
   - ✅ **Mistral 7B Instruct** (alternative - slightly cheaper)
   - ✅ **Claude Haiku** (more accurate but slower)
6. Click **Save changes**
7. Wait 5-10 minutes for models to enable

---

## Step 5: Verify Your Setup

### Option A: Test in AWS Console
1. Go to **Bedrock** → **Playground**
2. Select model: "Llama 3.1 8B Instruct"
3. Type a test message
4. Click "Run"
5. Should get response in <1 second ✅

### Option B: Test with CLI
```bash
# Install AWS CLI (if not installed)
pip install awscli

# Configure credentials
aws configure
# Enter:
# AWS Access Key ID: [paste your key]
# AWS Secret Access Key: [paste your secret]
# Default region: us-east-1
# Default output format: json

# Test connection
aws bedrock list-foundation-models --region us-east-1
# Should show list of available models
```

---

## Step 6: Create .env File

Create file: `c:\Users\rames\projects\TollingLLM\.env`

```env
# AWS Bedrock Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...your-actual-key...
AWS_SECRET_ACCESS_KEY=wJal...your-actual-secret...
BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0

# Backend Configuration
NODE_ENV=development
API_PORT=5000
FRONTEND_URL=http://localhost:3000

# MongoDB Configuration
MONGODB_URI=mongodb://admin:password@mongodb:27017/tolling_db?authSource=admin
MONGODB_DATABASE=tolling_db
MONGODB_COLLECTION=transactions
```

---

## Step 7: Build & Test Locally

```bash
cd c:\Users\rames\projects\TollingLLM

# Install AWS SDK
npm install

# Stop old containers
docker-compose down

# Rebuild with AWS credentials
docker-compose up --build

# Test at http://localhost:3000/agent
# Send query: "What is my total toll amount?"
# Expected: Response in <1 second ✅
```

---

## Available Bedrock Models

| Model | Model ID | Speed | Cost | Quality |
|-------|----------|-------|------|---------|
| **Llama 3.1 8B** | `meta.llama3-8b-instruct-v1:0` | <1 sec | $0.15/1M | Good |
| **Llama 3.1 70B** | `meta.llama3-70b-instruct-v1:0` | ~2 sec | $0.59/1M | Better |
| **Mistral 7B** | `mistral.mistral-7b-instruct-v0:2` | <1 sec | ~$0.12/1M | Good |
| **Claude Haiku** | `anthropic.claude-haiku-20242022-12-06` | 1-2 sec | $0.80/1M | Excellent |

---

## Troubleshooting

### ❌ "Model not found" error
→ Check if model is enabled in Bedrock → Model access

### ❌ "Invalid credentials" error
→ Copy-paste exact access key and secret from AWS console
→ Make sure `.env` file is in project root: `c:\Users\rames\projects\TollingLLM\.env`

### ❌ "No response" or timeout
→ Check if Bedrock is enabled in your region
→ Verify IAM user has `AmazonBedrockFullAccess` permission

### ❌ "Access Denied" error
→ Go to IAM → Users → your user
→ Add policy: `AmazonBedrockFullAccess`

---

## Security Notes

⚠️ **DO NOT commit `.env` file to Git!**

It's already in `.gitignore`, but double-check:

```bash
# Check if .env is ignored
cat .gitignore | grep "\.env"
# Should show: .env

# If not in .gitignore, add it:
echo ".env" >> .gitignore
git add .gitignore
git commit -m "chore: Ensure .env is ignored"
```

---

## Cost Monitoring

Monitor AWS costs to avoid surprises:

1. Go to **AWS Console** → **Billing Dashboard**
2. Set up billing alerts:
   - Go to **Billing Preferences**
   - Enable "Receive Billing Alerts"
   - Set threshold: $5-10/month
3. You'll get email if costs exceed limit

---

## Deployment to AWS (Next Step)

Once testing works locally, you can deploy to:
- **AWS ECS Fargate** (recommended)
- **AWS AppRunner** (simplest)
- **AWS EC2** (traditional VM)

Would you like a deployment guide after testing?
