# AWS AppRunner Deployment Guide (Recommended)

## Architecture

```
TollingLLM Application
├── Frontend (React/Vite)
├── Backend (Node.js/Express)
├── MongoDB (DocumentDB or external)
└── AWS Bedrock (LLM)
     ↓
AppRunner Service (auto-scaling)
     ↓
CloudFront (CDN + caching)
     ↓
Route53 (Custom domain)
     ↓
Public URL: https://tolling-llm.example.com
```

## Prerequisites

1. AWS Account with credentials rotated (see AWS_CREDENTIALS_ROTATION.md)
2. Docker installed locally
3. AWS CLI configured
4. ECR repository created

## Step 1: Push Docker Image to ECR

```bash
# Set variables
$AWS_ACCOUNT_ID = "YOUR_ACCOUNT_ID"  # Get from: aws sts get-caller-identity
$AWS_REGION = "us-east-1"
$ECR_REPO = "tolling-llm"

# Create ECR repository
aws ecr create-repository --repository-name $ECR_REPO --region $AWS_REGION

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push images
$ECR_URI = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"

# Build backend image
docker build -f docker/Dockerfile.backend -t tolling-llm-backend:latest .
docker tag tolling-llm-backend:latest $ECR_URI/backend:latest
docker push $ECR_URI/backend:latest

# Build frontend image (static)
docker build -f docker/Dockerfile.frontend -t tolling-llm-frontend:latest .
docker tag tolling-llm-frontend:latest $ECR_URI/frontend:latest
docker push $ECR_URI/frontend:latest
```

## Step 2: Use Docker Compose for Single Container

AppRunner works best with a single container. Combine backend + frontend:

Create `docker/Dockerfile.apprunner`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN cd backend && npm install && cd ..
RUN cd frontend && npm install && cd ..

# Build frontend
RUN cd frontend && npm run build && cd ..

# Copy source
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/

# Build backend
RUN cd backend && npm run build && cd ..

# Copy built frontend to backend public folder
RUN cp -r frontend/dist/* backend/dist/public/ || true

EXPOSE 5000

WORKDIR /app/backend
CMD ["npm", "start"]
```

Then push:
```bash
docker build -f docker/Dockerfile.apprunner -t tolling-llm:latest .
docker tag tolling-llm:latest $ECR_URI:latest
docker push $ECR_URI:latest
```

## Step 3: Create AppRunner Service

```bash
# Create AppRunner service from ECR image
aws apprunner create-service \
  --service-name tolling-llm \
  --source-configuration \
    ImageRepository={ImageIdentifier="$ECR_URI:latest",ImageRepositoryType=ECR,ImageConfiguration={Port=5000}} \
    AutoDeploymentsEnabled=true \
  --instance-configuration={InstanceRoleArn="arn:aws:iam::$AWS_ACCOUNT_ID:role/AppRunnerECRAccessRole"} \
  --region $AWS_REGION
```

### Create IAM Role for AppRunner

```bash
# Create trust policy
$trust_policy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@

$trust_policy | Out-File -FilePath trust-policy.json

# Create role
aws iam create-role \
  --role-name AppRunnerECRAccessRole \
  --assume-role-policy-document file://trust-policy.json

# Attach ECR access policy
aws iam attach-role-policy \
  --role-name AppRunnerECRAccessRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly

# Attach Bedrock policy
aws iam attach-role-policy \
  --role-name AppRunnerECRAccessRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
```

## Step 4: Set Environment Variables in AppRunner

In AWS Console → AppRunner → Select Service → Configuration → Environment:

```
NODE_ENV=production
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from Secrets Manager>
AWS_SECRET_ACCESS_KEY=<from Secrets Manager>
BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/tolling_db
MONGODB_DATABASE=tolling_db
MONGODB_COLLECTION=transactions
FRONTEND_URL=https://<apprunner-url>
API_PORT=5000
```

## Step 5: Configure Custom Domain

```bash
# Get AppRunner URL
$apprunner_url = aws apprunner describe-service \
  --service-arn arn:aws:apprunner:$AWS_REGION:$AWS_ACCOUNT_ID:service/tolling-llm \
  --region $AWS_REGION \
  --query 'Service.ServiceUrl' \
  --output text

echo "AppRunner URL: $apprunner_url"
```

### Connect Custom Domain

1. Go to Route53 → Hosted Zones → Your Domain
2. Create CNAME record:
   - Name: `tolling-llm`
   - Type: `CNAME`
   - Value: `<apprunner-url>`
3. AppRunner will auto-validate and create SSL certificate

## Step 6: Set Up CloudFront for Caching & WAF

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name $apprunner_url \
  --default-root-object index.html \
  --region $AWS_REGION
```

## Step 7: Auto-Scaling Configuration

In AppRunner Service → Auto Scaling:
- Min Instances: 1
- Max Instances: 10
- CPU Target: 70%
- Memory Target: 80%

## Step 8: Enable AWS CloudWatch Monitoring

```bash
# Create alarms
aws cloudwatch put-metric-alarm \
  --alarm-name tolling-llm-high-cpu \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/AppRunner \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## Cost Estimation

| Component | Monthly Cost |
|-----------|------------|
| AppRunner (1-10 instances) | $25-40 |
| Data transfer (10GB/month) | $1 |
| CloudFront (1GB transfer) | <$1 |
| Route53 | $0.50 |
| MongoDB Atlas (free tier) | $0-20 |
| **Total** | **~$30-60/month** |

## Monitoring & Logs

```bash
# View logs
aws logs tail /aws/apprunner/tolling-llm/application --follow

# Get service metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/AppRunner \
  --metric-name RequestCount \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Troubleshooting

### Service failing to start
```bash
aws apprunner describe-service \
  --service-arn <service-arn> \
  --query 'Service.ServiceStatus'
```

### Check logs for errors
```bash
aws logs tail /aws/apprunner/tolling-llm/application --follow --since 30m
```

### Rebuild and redeploy
```bash
docker push $ECR_URI:v2
aws apprunner start-deployment --service-arn <service-arn>
```

## Next Steps

1. ✅ Create IAM role (step 3)
2. ✅ Build and push Docker image (step 2)
3. ✅ Create AppRunner service (step 3)
4. ✅ Set environment variables (step 4)
5. ✅ Configure custom domain (step 5)
6. ✅ Set up CloudFront (step 6)
7. ✅ Configure auto-scaling (step 7)
8. ✅ Enable monitoring (step 8)

Your application will be live at: `https://tolling-llm.example.com`
