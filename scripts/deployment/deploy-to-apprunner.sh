#!/bin/bash
# AWS AppRunner Deployment Script for TollingLLM
# Usage: ./deploy-to-apprunner.sh

set -e

echo "🚀 TollingLLM AWS AppRunner Deployment"
echo "=====================================\n"

# Step 1: Get AWS Account ID
echo "Step 1: Getting AWS Account Information..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}
ECR_REPO="tolling-llm"
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"

echo "✅ AWS Account ID: $AWS_ACCOUNT_ID"
echo "✅ AWS Region: $AWS_REGION"
echo "✅ ECR URI: $ECR_URI\n"

# Step 2: Verify .env file
echo "Step 2: Verifying AWS Credentials..."
if [ -f ".env" ]; then
    if grep -q "YOUR_AWS_ACCESS_KEY_HERE" ".env"; then
        echo "❌ ERROR: Please update .env with real AWS credentials"
        echo "   See AWS_CREDENTIALS_ROTATION.md for instructions"
        exit 1
    fi
    echo "✅ .env file found with credentials"
else
    echo "❌ ERROR: .env file not found"
    echo "   Copy .env.example to .env and add your credentials"
    exit 1
fi

# Step 3: Create ECR Repository
echo "\nStep 3: Creating ECR Repository..."
aws ecr create-repository \
    --repository-name $ECR_REPO \
    --region $AWS_REGION \
    2>/dev/null || echo "✅ ECR Repository already exists"

# Step 4: Login to ECR
echo "\nStep 4: Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $ECR_URI

# Step 5: Build AppRunner Dockerfile
echo "\nStep 5: Building Docker Image..."
docker build \
    -f docker/Dockerfile.apprunner \
    -t tolling-llm:latest \
    -t $ECR_URI:latest \
    .

# Step 6: Push to ECR
echo "\nStep 6: Pushing Image to ECR..."
docker push $ECR_URI:latest
echo "✅ Image pushed to ECR"

# Step 7: Create/Update AppRunner Service
echo "\nStep 7: Creating AppRunner Service..."

# Check if service exists
if aws apprunner describe-service \
    --service-arn arn:aws:apprunner:$AWS_REGION:$AWS_ACCOUNT_ID:service/tolling-llm \
    --region $AWS_REGION 2>/dev/null; then
    echo "ℹ️  Service exists, starting new deployment..."
    aws apprunner start-deployment \
        --service-arn arn:aws:apprunner:$AWS_REGION:$AWS_ACCOUNT_ID:service/tolling-llm \
        --region $AWS_REGION
else
    echo "Creating new AppRunner service..."
    
    # Create IAM role first
    ROLE_NAME="AppRunnerTollingLLMRole"
    
    if ! aws iam get-role --role-name $ROLE_NAME 2>/dev/null; then
        echo "Creating IAM role..."
        cat > /tmp/trust-policy.json << EOF
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
EOF
        aws iam create-role \
            --role-name $ROLE_NAME \
            --assume-role-policy-document file:///tmp/trust-policy.json
        
        # Attach policies
        aws iam attach-role-policy \
            --role-name $ROLE_NAME \
            --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly
        
        aws iam attach-role-policy \
            --role-name $ROLE_NAME \
            --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
    fi
    
    sleep 10  # Wait for role to propagate
    
    ROLE_ARN="arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"
    
    aws apprunner create-service \
        --service-name tolling-llm \
        --source-configuration \
            ImageRepository=\{ImageIdentifier=$ECR_URI:latest,ImageRepositoryType=ECR,ImageConfiguration=\{Port=5000\}\} \
            AutoDeploymentsEnabled=true \
        --instance-configuration InstanceRoleArn=$ROLE_ARN \
        --region $AWS_REGION
    
    echo "✅ AppRunner service creation started"
fi

# Step 8: Wait for service and get URL
echo "\nStep 8: Getting Service URL..."
echo "⏳ Waiting for service to be active (this may take 2-5 minutes)..."

for i in {1..30}; do
    STATUS=$(aws apprunner describe-service \
        --service-arn arn:aws:apprunner:$AWS_REGION:$AWS_ACCOUNT_ID:service/tolling-llm \
        --region $AWS_REGION \
        --query 'Service.Status' \
        --output text 2>/dev/null || echo "LOADING")
    
    if [ "$STATUS" = "RUNNING" ]; then
        APP_URL=$(aws apprunner describe-service \
            --service-arn arn:aws:apprunner:$AWS_REGION:$AWS_ACCOUNT_ID:service/tolling-llm \
            --region $AWS_REGION \
            --query 'Service.ServiceUrl' \
            --output text)
        
        echo "\n🎉 SUCCESS!"
        echo "✅ Service Status: $STATUS"
        echo "✅ Public URL: https://$APP_URL"
        echo "\n📊 Next Steps:"
        echo "   1. Visit: https://$APP_URL"
        echo "   2. Configure custom domain in Route53"
        echo "   3. Set up CloudFront for CDN caching"
        echo "   4. Monitor in CloudWatch"
        break
    fi
    
    echo "   Status: $STATUS (attempt $i/30)"
    sleep 10
done

if [ "$STATUS" != "RUNNING" ]; then
    echo "❌ Service deployment timeout. Check AWS Console for details."
    exit 1
fi

echo "\n📝 Environment Variables Set:"
echo "   NODE_ENV=production"
echo "   AWS_REGION=$AWS_REGION"
echo "   BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0"
echo "\n✅ Deployment complete! Your app is now live."
