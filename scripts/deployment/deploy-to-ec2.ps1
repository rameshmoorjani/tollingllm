# EC2 Deployment Script for TollingLLM
# This script sets up and deploys the application to AWS EC2

param(
    [string]$InstanceType = "t3.medium",
    [string]$KeyPairName = "tolling-llm-key",
    [string]$Region = "us-east-1",
    [int]$Port = 5000
)

$ErrorActionPreference = "Stop"

Write-Host "=== TollingLLM EC2 Deployment ===" -ForegroundColor Cyan
Write-Host "Region: $Region"
Write-Host "Instance Type: $InstanceType"
Write-Host ""

# 1. Create IAM Role for EC2
Write-Host "Step 1: Creating IAM Role..." -ForegroundColor Yellow
$trustPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Principal = @{
                Service = "ec2.amazonaws.com"
            }
            Action = "sts:AssumeRole"
        }
    )
} | ConvertTo-Json -Depth 10

$trustPolicy | Set-Content -Path "ec2-trust-policy.json"

try {
    $roleName = "TollingLLMEC2Role"
    aws iam create-role --role-name $roleName --assume-role-policy-document file://ec2-trust-policy.json --region $Region 2>&1 | Select-String "AssumeRolePolicyDocument|Error" | Out-Null
    Write-Host "✓ Role created" -ForegroundColor Green
} catch {
    Write-Host "Role may already exist, continuing..." -ForegroundColor Yellow
}

# 2. Attach Policies
Write-Host "Step 2: Attaching policies..." -ForegroundColor Yellow

$policies = @(
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",  # For Systems Manager Session Manager
    "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"     # For CloudWatch
)

foreach ($policy in $policies) {
    aws iam attach-role-policy --role-name TollingLLMEC2Role --policy-arn $policy --region $Region 2>&1 | Out-Null
}

# Add inline policy for Bedrock and ECR
$inlinePolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Sid    = "BedrockAccess"
            Effect = "Allow"
            Action = @(
                "bedrock:InvokeModel",
                "bedrock:ListModels"
            )
            Resource = "*"
        },
        @{
            Sid    = "ECRAccess"
            Effect = "Allow"
            Action = @(
                "ecr:GetAuthorizationToken",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:BatchCheckLayerAvailability"
            )
            Resource = "*"
        }
    )
} | ConvertTo-Json -Depth 10

$inlinePolicy | Set-Content -Path "ec2-bedrock-policy.json"

aws iam put-role-policy --role-name TollingLLMEC2Role --policy-name BedrockAccess --policy-document file://ec2-bedrock-policy.json --region $Region 2>&1 | Out-Null
Write-Host "✓ Policies attached" -ForegroundColor Green

# 3. Create Instance Profile
Write-Host "Step 3: Creating instance profile..." -ForegroundColor Yellow
try {
    aws iam create-instance-profile --instance-profile-name TollingLLMEC2Profile --region $Region 2>&1 | Out-Null
} catch {
    Write-Host "Instance profile may already exist" -ForegroundColor Yellow
}

aws iam add-role-to-instance-profile --instance-profile-name TollingLLMEC2Profile --role-name TollingLLMEC2Role --region $Region 2>&1 | Out-Null
Write-Host "✓ Instance profile created" -ForegroundColor Green

# 4. Create/Get Security Group
Write-Host "Step 4: Setting up security group..." -ForegroundColor Yellow

$sgName = "tolling-llm-sg"
$vpcId = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --region $Region --query 'Vpcs[0].VpcId' --output text

try {
    $sgId = aws ec2 create-security-group --group-name $sgName --description "Security group for TollingLLM" --vpc-id $vpcId --region $Region --query 'GroupId' --output text
    Write-Host "✓ Security group created: $sgId" -ForegroundColor Green
    
    # Wait for security group to be available
    Start-Sleep -Seconds 2
    
    # Add ingress rules
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $Region 2>&1 | Out-Null
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $Region 2>&1 | Out-Null
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $Region 2>&1 | Out-Null
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port $Port --cidr 0.0.0.0/0 --region $Region 2>&1 | Out-Null
    
    Write-Host "✓ Ingress rules configured" -ForegroundColor Green
} catch {
    $sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$sgName" --region $Region --query 'SecurityGroups[0].GroupId' --output text
    Write-Host "Security group already exists: $sgId" -ForegroundColor Yellow
}

# 5. Create/Get Key Pair
Write-Host "Step 5: Setting up key pair..." -ForegroundColor Yellow

try {
    aws ec2 create-key-pair --key-name $KeyPairName --region $Region --query 'KeyMaterial' --output text | Set-Content -Path "$KeyPairName.pem"
    Write-Host "✓ Key pair created: $KeyPairName.pem" -ForegroundColor Green
} catch {
    Write-Host "Key pair already exists: $KeyPairName" -ForegroundColor Yellow
}

# 6. User data script
$userData = @"
#!/bin/bash
set -e

# Update system
sudo yum update -y
sudo yum install -y git docker

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository (or pull if updating)
if [ ! -d /opt/tolling-llm ]; then
    cd /opt
    git clone https://github.com/ramesaliyev/TollingLLM.git tolling-llm || mkdir -p tolling-llm
else
    cd /opt/tolling-llm
    git pull 2>/dev/null || true
fi

cd /opt/tolling-llm

# Configure environment
cat > .env << 'EOF'
NODE_ENV=production
MONGODB_URI=mongodb://admin:password@mongodb:27017/tolling_db?authSource=admin
MONGODB_DATABASE=tolling_db
MONGODB_COLLECTION=transactions
AWS_REGION=us-east-1
BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0
API_HOST=0.0.0.0
API_PORT=5000
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
EOF

# Start application
sudo -u ec2-user docker-compose up -d

# Send notification
echo "Deployment complete! Application running on port 5000"
"@

Write-Host "Step 6: Preparing EC2 instance launch..." -ForegroundColor Yellow

# Get latest Amazon Linux 2 AMI
$amiId = aws ec2 describe-images --owners amazon --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" --region $Region --query 'sort_by(Images, &CreationDate)[-1].ImageId' --output text

Write-Host "Using AMI: $amiId"

# 7. Launch EC2 Instance
Write-Host "Step 7: Launching EC2 instance..." -ForegroundColor Yellow

$userDataB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($userData))

$instanceId = aws ec2 run-instances `
    --image-id $amiId `
    --instance-type $InstanceType `
    --key-name $KeyPairName `
    --security-group-ids $sgId `
    --iam-instance-profile Name=TollingLLMEC2Profile `
    --user-data $userDataB64 `
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=tolling-llm-app}]" `
    --region $Region `
    --query 'Instances[0].InstanceId' `
    --output text

Write-Host "✓ Instance launched: $instanceId" -ForegroundColor Green

# 8. Wait for instance and get details
Write-Host "Step 8: Waiting for instance to be running..." -ForegroundColor Yellow

aws ec2 wait instance-running --instance-ids $instanceId --region $Region

Start-Sleep -Seconds 5

$publicIp = aws ec2 describe-instances --instance-ids $instanceId --region $Region --query 'Reservations[0].Instances[0].PublicIpAddress' --output text

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Instance ID: $instanceId" -ForegroundColor Cyan
Write-Host "Public IP: $publicIp" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access your application:" -ForegroundColor Yellow
Write-Host "  - Frontend: http://$publicIp`:3000"
Write-Host "  - Backend API: http://$publicIp`:$Port"
Write-Host ""
Write-Host "SSH Access:" -ForegroundColor Yellow
Write-Host "  ssh -i $KeyPairName.pem ec2-user@$publicIp"
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f"
Write-Host ""

# Save instance info
@{
    InstanceId = $instanceId
    PublicIp   = $publicIp
    KeyPair    = $KeyPairName
    Region     = $Region
    SecurityGroup = $sgId
} | ConvertTo-Json | Set-Content -Path "ec2-instance.json"

Write-Host "✓ Instance details saved to ec2-instance.json" -ForegroundColor Green
