# AWS Credentials Rotation & Security Guide

## ⚠️ URGENT: Rotate Exposed AWS Credentials

Your current AWS credentials are exposed in your local `.env` file. Follow these steps:

### Step 1: Deactivate Old Credentials (Immediate)

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam)
2. Click **Users** → Select your IAM user
3. Click **Security Credentials** tab
4. Find your exposed Access Key (AKIARRHONJNXM7WG6SOC)
5. Click **Deactivate** (or **Delete** after confirming no other systems use it)

### Step 2: Create New Access Key

1. In **Security Credentials** tab, click **Create Access Key**
2. Choose **Application running outside AWS** → **Next**
3. Add description: "TollingLLM - Generated [DATE]"
4. Click **Create Access Key**
5. **Copy both values immediately** (you won't see the secret again)

### Step 3: Update Your Local .env

Replace in `.env`:
```bash
AWS_ACCESS_KEY_ID=YOUR_NEW_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_NEW_SECRET_KEY
```

### Step 4: Copy to AWS Secrets Manager (Production)

For AWS deployment, store credentials in **AWS Secrets Manager**:

```bash
aws secretsmanager create-secret \
  --name tolling-llm/bedrock \
  --secret-string '{"AWS_ACCESS_KEY_ID":"YOUR_KEY","AWS_SECRET_ACCESS_KEY":"YOUR_SECRET"}'
```

### Step 5: Commit to Git

```bash
git add -A
git commit -m "Add AWS deployment configuration (credentials in Secrets Manager)"
git push origin v5-aws-bedrock
```

## Verify No Credentials in Git History

```bash
# Search git history for AWS keys
git log -S "AKIA" --oneline
git log -S "aws_secret_access_key" --oneline

# If found, use git-filter-branch or BFG Repo-Cleaner to remove
```

---

## AWS Deployment Architecture

### Option 1: ECS Fargate (Recommended - Serverless)
- **Cost**: $30-50/month
- **Scaling**: Automatic
- **SSL**: Free with CloudFront
- **Setup time**: 20-30 minutes

### Option 2: AppRunner (Simplest)
- **Cost**: $25-40/month
- **Scaling**: Automatic
- **Setup time**: 10 minutes

### Option 3: EC2 + Auto Scaling
- **Cost**: $40-100/month
- **Scaling**: Manual/Lambda-based
- **Control**: Maximum

### Option 4: Kubernetes (EKS)
- **Cost**: $75+/month
- **Scaling**: Advanced
- **Setup time**: 1+ hour

**RECOMMENDATION**: Use **AppRunner** for quickest deployment, upgrade to **ECS Fargate** for more control.

---

## Next Steps

1. ✅ Rotate credentials (above)
2. ✅ Update `.env` locally
3. ⏳ Deploy to AWS (see AWS_DEPLOYMENT_APPRUNNER.md)
4. ✅ Set up auto-scaling
5. ✅ Configure custom domain
