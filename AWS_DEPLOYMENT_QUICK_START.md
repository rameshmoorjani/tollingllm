# AWS Deployment Guide for TollingLLM

## Quick Start (5 minutes)

### Prerequisites
- AWS Account with active billing
- AWS CLI configured with credentials
- Docker installed
- PowerShell or Bash

### 1️⃣ Rotate AWS Credentials (CRITICAL - Do First!)

⚠️ **Your AWS credentials are exposed in your local `.env`**

Follow this guide: [AWS_CREDENTIALS_ROTATION.md](AWS_CREDENTIALS_ROTATION.md)

### 2️⃣ Run Automated Deployment

#### Windows (PowerShell)
```powershell
.\deploy-to-apprunner.ps1
```

#### macOS/Linux (Bash)
```bash
chmod +x deploy-to-apprunner.sh
./deploy-to-apprunner.sh
```

The script will:
- ✅ Create ECR repository
- ✅ Build Docker image
- ✅ Push to ECR
- ✅ Create AppRunner service
- ✅ Wait for deployment
- ✅ Return public URL

---

## Architecture Diagram

```
┌─────────────────────────────────────┐
│   TollingLLM Application            │
│   ├─ React Frontend (Vite)          │
│   ├─ Node.js Backend (Express)      │
│   └─ MongoDB Integration            │
└─────────────────────────────────────┘
                  │
                  ▼
      ┌───────────────────────┐
      │   AWS AppRunner       │
      │   (Auto-scaling)      │
      │   1-10 instances      │
      └───────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
    ┌─────────┐      ┌──────────────┐
    │CloudFront│     │Route53       │
    │(CDN)    │     │(Custom Domain)
    └─────────┘      └──────────────┘
        │                    │
        └─────────┬──────────┘
                  ▼
    🌐 Public URL: https://tolling-llm.example.com
```

---

## Deployment Options Comparison

| Option | Cost | Setup Time | Scaling | Recommended |
|--------|------|-----------|---------|------------|
| **AppRunner** | $25-40/mo | 10 min | Auto ✅ | **BEST** |
| ECS Fargate | $30-50/mo | 20 min | Auto ✅ | Good |
| EC2 + ASG | $40-100/mo | 30 min | Manual | Complex |
| Lambda + API Gateway | $5-20/mo | 25 min | Auto ✅ | Limited support |

**→ We recommend AppRunner for ease of use and automatic scaling**

---

## What Gets Deployed

### Frontend
- React + Vite (compiled to static files)
- Served by Express backend at `/`
- Auto-caching with CloudFront

### Backend
- Node.js server on port 5000
- All microservices (chat, API, WebSocket)
- AWS Bedrock integration
- MongoDB connection

### Infrastructure
- AppRunner service (containerized)
- Auto-scaling (1-10 instances based on CPU/memory)
- Health checks every 30 seconds
- CloudWatch logs and monitoring

---

## Environment Variables in Production

AppRunner will use these environment variables:

```env
NODE_ENV=production
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from AWS Secrets Manager>
AWS_SECRET_ACCESS_KEY=<from AWS Secrets Manager>
BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tolling_db
MONGODB_DATABASE=tolling_db
MONGODB_COLLECTION=transactions
API_HOST=0.0.0.0
API_PORT=5000
LOG_LEVEL=info
```

### Store Secrets Safely

```bash
# Create secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name tolling-llm/secrets \
  --secret-string '{
    "AWS_ACCESS_KEY_ID":"YOUR_KEY",
    "AWS_SECRET_ACCESS_KEY":"YOUR_SECRET"
  }'
```

---

## Monitoring & Scaling

### Check Service Status
```bash
aws apprunner describe-service \
  --service-name tolling-llm \
  --query 'Service.Status'
```

### View Logs
```bash
# Real-time logs
aws logs tail /aws/apprunner/tolling-llm/application --follow

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/apprunner/tolling-llm/application \
  --filter-pattern "ERROR"
```

### Auto-Scaling Configuration
- **Min Instances**: 1
- **Max Instances**: 10
- **CPU Target**: 70%
- **Memory Target**: 80%

Adjust in AppRunner settings if needed.

---

## Custom Domain Setup

### Using Route53

1. **Create hosted zone** (if not already done):
   ```bash
   aws route53 create-hosted-zone \
     --name tolling-llm.example.com \
     --caller-reference $(date +%s)
   ```

2. **Create CNAME record**:
   ```bash
   ZONE_ID=$(aws route53 list-hosted-zones --query 'HostedZones[0].Id' --output text)
   
   aws route53 change-resource-record-sets \
     --hosted-zone-id $ZONE_ID \
     --change-batch '{
       "Changes": [{
         "Action": "CREATE",
         "ResourceRecordSet": {
           "Name": "tolling-llm.example.com",
           "Type": "CNAME",
           "TTL": 300,
           "ResourceRecords": [{"Value": "YOUR_APPRUNNER_URL"}]
         }
       }]
     }'
   ```

3. **SSL Certificate**: AppRunner auto-creates SSL for CNAME records ✅

---

## CloudFront CDN Setup (Optional but Recommended)

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name YOUR_APPRUNNER_URL \
  --default-cache-behavior \
    ViewerProtocolPolicy=redirect-to-https,
    AllowedMethods=[GET,HEAD,OPTIONS],
    Compress=true,
    ForwardedValues={QueryString=false}
```

**Benefits**:
- 🚀 50% faster globally
- 💰 Reduces AppRunner bandwidth costs
- 🔒 DDoS protection included
- 🌍 Edge caching in 200+ locations

---

## Estimated Monthly Cost

| Service | Usage | Cost |
|---------|-------|------|
| AppRunner | 10GB compute | $25-40 |
| Data transfer | 10GB out | $1 |
| CloudFront | 1GB cached | <$1 |
| Route53 | Hosted zone | $0.50 |
| Bedrock | 100 requests/day | $3-5 |
| MongoDB (Atlas) | Free tier | $0 |
| **TOTAL** | | **~$30-50/month** |

---

## Troubleshooting

### Service won't start
```bash
# Check recent logs
aws logs tail /aws/apprunner/tolling-llm/application --since 10m

# Redeploy
aws apprunner start-deployment \
  --service-arn arn:aws:apprunner:REGION:ACCOUNT:service/tolling-llm
```

### High CPU/Memory usage
- Scale to more instances: Config → Instance Config → CPU/Memory
- Enable detailed monitoring: CloudWatch → Metrics

### 502 Bad Gateway errors
- Check backend logs for errors
- Verify MongoDB connection string
- Verify AWS Bedrock credentials

### SSL Certificate issues
- Wait 15 minutes for auto-certificate
- Check domain DNS records point to AppRunner URL

---

## Next Steps

1. ✅ **Rotate credentials** → [AWS_CREDENTIALS_ROTATION.md](AWS_CREDENTIALS_ROTATION.md)
2. ✅ **Run deployment** → `.\deploy-to-apprunner.ps1`
3. ✅ **Test in browser** → Visit the public URL
4. ✅ **Configure domain** → Route53 + CloudFront
5. ✅ **Enable monitoring** → CloudWatch alarms
6. ✅ **Set up backups** → MongoDB Atlas backups

---

## Getting Help

- **AWS AppRunner Docs**: https://docs.aws.amazon.com/apprunner/
- **AWS Bedrock Docs**: https://docs.aws.amazon.com/bedrock/
- **Troubleshooting**: See logs with `aws logs tail /aws/apprunner/tolling-llm/application`

---

## Security Checklist

- [ ] AWS credentials rotated
- [ ] `.env` NOT committed to git
- [ ] Secrets stored in AWS Secrets Manager
- [ ] CloudFront enabled for DDoS protection
- [ ] VPC security groups configured
- [ ] CloudWatch alarms set up
- [ ] Backup strategy for MongoDB
- [ ] SSL certificate active

---

**Deployed at**: `https://tolling-llm.[your-domain].com` 🎉
