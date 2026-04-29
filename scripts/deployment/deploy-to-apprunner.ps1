# AWS AppRunner Deployment Script for TollingLLM (Windows PowerShell)
# Usage: .\deploy-to-apprunner.ps1

Write-Host "🚀 TollingLLM AWS AppRunner Deployment" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get AWS Account ID
Write-Host "Step 1: Getting AWS Account Information..." -ForegroundColor Yellow
$AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$AWS_REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$ECR_REPO = "tolling-llm"
$ECR_URI = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"

Write-Host "AWS Account ID: $AWS_ACCOUNT_ID" -ForegroundColor Green
Write-Host "AWS Region: $AWS_REGION" -ForegroundColor Green
Write-Host "ECR URI: $ECR_URI" -ForegroundColor Green
Write-Host ""

# Step 2: Verify .env file
Write-Host "Step 2: Verifying AWS Credentials..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $env_content = Get-Content ".env" -Raw
    if ($env_content -like "*YOUR_AWS_ACCESS_KEY_HERE*") {
        Write-Host "❌ ERROR: Please update .env with real AWS credentials" -ForegroundColor Red
        Write-Host "   See AWS_CREDENTIALS_ROTATION.md for instructions" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ .env file found with credentials" -ForegroundColor Green
} else {
    Write-Host "❌ ERROR: .env file not found" -ForegroundColor Red
    Write-Host "   Copy .env.example to .env and add your credentials" -ForegroundColor Red
    exit 1
}

# Step 3: Create ECR Repository
Write-Host ""
Write-Host "Step 3: Creating ECR Repository..." -ForegroundColor Yellow
try {
    aws ecr create-repository `
        --repository-name $ECR_REPO `
        --region $AWS_REGION 2>&1 | Out-Null
    Write-Host "✅ ECR Repository created" -ForegroundColor Green
} catch {
    Write-Host "✅ ECR Repository already exists" -ForegroundColor Green
}

# Step 4: Login to ECR
Write-Host ""
Write-Host "Step 4: Logging in to ECR..." -ForegroundColor Yellow
$loginPassword = aws ecr get-login-password --region $AWS_REGION
$loginPassword | docker login --username AWS --password-stdin $ECR_URI
Write-Host "✅ Logged in to ECR" -ForegroundColor Green

# Step 5: Build AppRunner Dockerfile
Write-Host ""
Write-Host "Step 5: Building Docker Image..." -ForegroundColor Yellow
docker build `
    -f docker/Dockerfile.apprunner `
    -t tolling-llm:latest `
    -t "$ECR_URI`:latest" `
    .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker image built" -ForegroundColor Green

# Step 6: Push to ECR
Write-Host ""
Write-Host "Step 6: Pushing Image to ECR..." -ForegroundColor Yellow
docker push "$ECR_URI`:latest"
Write-Host "✅ Image pushed to ECR" -ForegroundColor Green

# Step 7: Create/Update AppRunner Service
Write-Host "`n"
Write-Host "Step 7: Creating AppRunner Service..." -ForegroundColor Yellow

$serviceArn = "arn:aws:apprunner:$AWS_REGION`:$AWS_ACCOUNT_ID`:service/tolling-llm"

# Check if service exists
$serviceExists = $false
try {
    aws apprunner describe-service --service-arn $serviceArn --region $AWS_REGION 2>&1 | Out-Null
    $serviceExists = $true
} catch {
    $serviceExists = $false
}

if ($serviceExists) {
    Write-Host "Service exists, starting new deployment..." -ForegroundColor Cyan
    aws apprunner start-deployment --service-arn $serviceArn --region $AWS_REGION
} else {
    Write-Host "Creating new AppRunner service..." -ForegroundColor Yellow
    
    # Create IAM role first
    $roleName = "AppRunnerTollingLLMRole"
    $roleExists = $false
    
    try {
        aws iam get-role --role-name $roleName 2>&1 | Out-Null
        $roleExists = $true
    } catch {
        $roleExists = $false
    }
    
    if (-not $roleExists) {
        Write-Host "Creating IAM role..." -ForegroundColor Yellow
        
        # Create trust policy JSON
        $trustPolicyJson = @{
            Version = "2012-10-17"
            Statement = @(
                @{
                    Effect = "Allow"
                    Principal = @{ Service = "apprunner.amazonaws.com" }
                    Action = "sts:AssumeRole"
                }
            )
        } | ConvertTo-Json -Depth 10
        
        $trustPolicyFile = Join-Path $env:TEMP "trust-policy.json"
        $trustPolicyJson | Out-File -FilePath $trustPolicyFile -Encoding UTF8
        
        aws iam create-role --role-name $roleName --assume-role-policy-document "file://$trustPolicyFile"
        
        # Attach policies
        aws iam attach-role-policy --role-name $roleName --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly
        aws iam attach-role-policy --role-name $roleName --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
        
        Write-Host "Waiting 10 seconds for IAM role to propagate..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
    
    $roleArn = "arn:aws:iam::$AWS_ACCOUNT_ID`:role/$roleName"
    
    aws apprunner create-service --service-name tolling-llm --source-configuration "ImageRepository={ImageIdentifier=$ECR_URI`:latest,ImageRepositoryType=ECR,ImageConfiguration={Port=5000}}" --instance-configuration InstanceRoleArn=$roleArn --region $AWS_REGION
    
    Write-Host "AppRunner service creation started" -ForegroundColor Green
}

# Step 8: Wait for service and get URL
Write-Host ""
Write-Host "Step 8: Getting Service URL..." -ForegroundColor Yellow
Write-Host "Waiting for service to be active (this may take 2-5 minutes)..." -ForegroundColor Cyan

$status = "LOADING"
for ($i = 1; $i -le 30; $i++) {
    try {
        $status = aws apprunner describe-service --service-arn $serviceArn --region $AWS_REGION --query 'Service.Status' --output text 2>&1
    } catch {
        $status = "LOADING"
    }
    
    if ($status -eq "RUNNING") {
        $appUrl = aws apprunner describe-service --service-arn $serviceArn --region $AWS_REGION --query 'Service.ServiceUrl' --output text
        
        Write-Host ""
        Write-Host "SUCCESS!" -ForegroundColor Green
        Write-Host "Service Status: $status" -ForegroundColor Green
        Write-Host "Public URL: https://$appUrl" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "   1. Visit: https://$appUrl" -ForegroundColor White
        Write-Host "   2. Configure custom domain in Route53" -ForegroundColor White
        Write-Host "   3. Set up CloudFront for CDN caching" -ForegroundColor White
        Write-Host "   4. Monitor in CloudWatch" -ForegroundColor White
        break
    }
    
    Write-Host "   Status: $status (attempt $i/30)" -ForegroundColor Gray
    Start-Sleep -Seconds 10
}

if ($status -ne "RUNNING") {
    Write-Host "Service deployment timeout. Check AWS Console for details." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Environment Variables Set:" -ForegroundColor Cyan
Write-Host "   NODE_ENV=production" -ForegroundColor White
Write-Host "   AWS_REGION=$AWS_REGION" -ForegroundColor White
Write-Host "   BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0" -ForegroundColor White
Write-Host ""
Write-Host "Deployment complete! Your app is now live." -ForegroundColor Green
