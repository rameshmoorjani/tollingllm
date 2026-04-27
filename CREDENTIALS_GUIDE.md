# AWS Credentials - Secure Implementation Guide

## ✅ Current Setup (Already Done)

Your project is **already configured** to use environment variables securely:

**In `docker-compose.yml`:**
```yaml
environment:
  AWS_REGION: ${AWS_REGION:-us-east-1}
  AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
  AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
```

**In `bedrockService.ts`:**
```typescript
const region = process.env.AWS_REGION || 'us-east-1';
const client = new BedrockRuntimeClient({ region });
```

✅ Credentials are **read from environment**, **NOT hardcoded**

---

## 3 Ways to Provide Credentials (No Hardcoding)

### Method 1: Using .env File (Local Development) ✅ RECOMMENDED

**Create `.env` file** (in project root):
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...your-key...
AWS_SECRET_ACCESS_KEY=wJal...your-secret...
BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0
```

**Load from .env:**
```bash
# Option A: Use dotenv (already installed)
cd c:\Users\rames\projects\TollingLLM
# Just run docker-compose - .env is auto-loaded

# Option B: Manual load (Windows PowerShell)
$env:AWS_REGION="us-east-1"
$env:AWS_ACCESS_KEY_ID="your-key"
$env:AWS_SECRET_ACCESS_KEY="your-secret"
docker-compose up --build

# Option C: export .env to environment (Linux/Mac)
export $(cat .env | xargs)
docker-compose up --build
```

**Important:** `.env` is in `.gitignore` - it won't be committed

---

### Method 2: AWS CLI Profile (Local Development)

AWS CLI automatically finds credentials from profile.

**Step 1: Configure AWS CLI**
```bash
aws configure --profile tollingllm
# Enter:
# AWS Access Key ID: AKIA...your-key...
# AWS Secret Access Key: wJal...your-secret...
# Default region: us-east-1
# Default output format: json
```

**Step 2: Use in docker-compose.yml**
```yaml
backend:
  environment:
    # Uses $HOME/.aws/credentials automatically
    AWS_PROFILE: tollingllm
    AWS_REGION: ${AWS_REGION:-us-east-1}
```

**Step 3: Run**
```bash
docker-compose up --build
```

---

### Method 3: IAM Roles (AWS Deployment - BEST) ✅ MOST SECURE

When deployed to AWS (ECS, EC2, AppRunner), use **IAM Roles** instead of credentials:

**Benefits:**
- ✅ No credentials in code/environment
- ✅ Auto-rotated by AWS
- ✅ Least privilege access
- ✅ Audit trail

**Step 1: Create IAM Role**
```bash
# AWS Console → IAM → Roles → Create role
# Select: AWS service → ECS (or EC2/AppRunner)
# Add policy: AmazonBedrockFullAccess
```

**Step 2: Attach to Container/Instance**
- ECS Task: Attach role to task definition
- EC2: Attach role to instance
- AppRunner: Attach role to service

**Step 3: No credentials needed!**
```typescript
// AWS SDK automatically uses IAM role
const client = new BedrockRuntimeClient({ region });
```

---

## Project Structure (No Credentials Exposed)

```
TollingLLM/
├── .env                    ← NEVER COMMIT (in .gitignore) ✅
├── .env.example            ← Template only (SAFE to commit) ✅
├── .gitignore              ← Shows .env is ignored ✅
├── docker-compose.yml      ← Reads from .env ${...} ✅
└── backend/
    ├── src/
    │   └── services/
    │       └── bedrockService.ts  ← Reads from process.env ✅
    └── package.json
```

---

## Setup Instructions (Step-by-Step)

### For Local Development:

**Step 1: Create `.env` file**
```bash
cd c:\Users\rames\projects\TollingLLM
```

Create file: `c:\Users\rames\projects\TollingLLM\.env`
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...get from AWS console...
AWS_SECRET_ACCESS_KEY=wJal...get from AWS console...
BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0
```

**Step 2: Verify .env is ignored**
```bash
cat .gitignore | grep ".env"
# Should show: .env
```

**Step 3: Run**
```bash
docker-compose down
docker-compose up --build
# Automatically reads from .env
```

**Step 4: Test**
```
Open http://localhost:3000/agent
Send query → Should respond in <1 second
```

---

### For AWS Deployment:

**When deploying to AWS, use IAM Roles instead:**
- ECS Fargate: Create task role with Bedrock permission
- EC2: Attach IAM role to instance
- AppRunner: Create service role with Bedrock permission
- Lambda: Create function role with Bedrock permission

**Then:**
```typescript
// AWS SDK auto-detects role credentials
const client = new BedrockRuntimeClient({ region: 'us-east-1' });
```

---

## Verify Setup is Correct

### Check 1: .env file exists and ignored
```bash
cd c:\Users\rames\projects\TollingLLM
ls -la .env          # File exists
cat .gitignore      # Shows .env
git status          # Should NOT show .env
```

### Check 2: .env has right format
```bash
cat .env
# Should show:
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=AKIA...
# AWS_SECRET_ACCESS_KEY=wJal...
# BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0
```

### Check 3: Docker reads from .env
```bash
docker-compose up --build
# Look for logs:
# 🤖 AWS Bedrock Service initialized
# 📍 Region: us-east-1
# 📊 Model: meta.llama3-8b-instruct-v1:0
```

---

## Security Best Practices

✅ **DO:**
- Store credentials in `.env` file (local only)
- Add `.env` to `.gitignore` ✅ Already done
- Use IAM roles for AWS deployment
- Rotate credentials every 90 days
- Use separate credentials for dev/prod
- Monitor AWS CloudTrail for usage

❌ **DON'T:**
- Commit `.env` to Git
- Hardcode credentials in code
- Share `.env` file in email/Slack
- Use root AWS account credentials (use IAM)
- Log credentials in console output

---

## Common Issues

### ❌ Error: "Invalid credentials"
**Solutions:**
1. Check `.env` file exists: `ls .env`
2. Check format: `cat .env` (no spaces around `=`)
3. Exact copy from AWS console (no extra quotes)
4. Restart Docker: `docker-compose down && docker-compose up --build`

### ❌ Error: "AccessDenied"
**Solutions:**
1. Verify IAM user has `AmazonBedrockFullAccess` policy
2. Check AWS region is correct (`us-east-1` recommended)
3. Verify Bedrock models are enabled for your region

### ❌ Error: "Unable to find .env file"
**Solutions:**
1. Create `.env` in project root
2. Check working directory: `pwd` should be `c:\Users\rames\projects\TollingLLM`
3. Reload environment: `docker-compose down && docker-compose up --build`

---

## Summary

| Where | Method | Security | Use Case |
|-------|--------|----------|----------|
| Local PC | `.env` file | ✅ Good | Development |
| Local PC | AWS CLI profile | ✅ Good | Development |
| AWS Cloud | IAM Role | ✅✅ Best | Production |

**For you now:**
1. Create `.env` with your credentials
2. Run `docker-compose up --build`
3. Test at `http://localhost:3000/agent`
4. Never commit `.env` to Git

Ready to test?
