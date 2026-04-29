# QUICK START: Deploy TollingLLM to EC2 in 10 Minutes

## Option A: Fastest (AWS Console - 5 clicks)

### 1. Go to AWS Console
- https://console.aws.amazon.com/ec2/

### 2. Click "Launch instances"

### 3. Configure:
```
Name: tolling-llm-app
AMI: Amazon Linux 2 (free tier)
Instance Type: t3.medium
Key Pair: Create new → Name: tolling-llm-key → Download .pem file
Network: Default VPC, Auto-assign public IP: Enable
Security Group: Create new
  - Inbound: SSH (22), HTTP (80), Custom (5000)
  - Source: 0.0.0.0/0
Storage: 30 GB gp3
```

### 4. Click "Launch" 
Wait 2 minutes for instance to start, then note the **Public IP**

### 5. SSH and Deploy
```bash
# Windows PowerShell
ssh -i tolling-llm-key.pem ec2-user@<PUBLIC_IP>

# Then run:
cd ~
git clone https://github.com/ramesaliyev/TollingLLM.git
cd TollingLLM
bash deploy-on-ec2.sh
```

---

## Option B: Single AWS CLI Command

If you have AWS CLI configured:

```powershell
# Get latest Amazon Linux 2 AMI ID
$amiId = aws ec2 describe-images --owners amazon `
  --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" `
  --region us-east-1 `
  --query 'sort_by(Images,&CreationDate)[-1].ImageId' `
  --output text

# Create security group
$sgId = aws ec2 create-security-group `
  --group-name tolling-llm-sg `
  --description "TollingLLM Security Group" `
  --region us-east-1 `
  --query 'GroupId' `
  --output text

# Add ingress rules
22, 80, 5000 | ForEach-Object {
  aws ec2 authorize-security-group-ingress `
    --group-id $sgId --protocol tcp --port $_ `
    --cidr 0.0.0.0/0 --region us-east-1 2>&1 | Out-Null
}

# Create key pair
aws ec2 create-key-pair --key-name tolling-llm-key `
  --region us-east-1 --query 'KeyMaterial' --output text `
  | Set-Content -Path './tolling-llm-key.pem'

# Launch instance
$result = aws ec2 run-instances `
  --image-id $amiId `
  --instance-type t3.medium `
  --key-name tolling-llm-key `
  --security-group-ids $sgId `
  --user-data 'file://user-data.sh' `
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=tolling-llm-app}]" `
  --region us-east-1 `
  --output json | ConvertFrom-Json

$instanceId = $result.Instances[0].InstanceId
Write-Host "Instance launched: $instanceId"
Write-Host "Waiting for public IP..."

Start-Sleep -Seconds 30
$ip = aws ec2 describe-instances --instance-ids $instanceId `
  --region us-east-1 `
  --query 'Reservations[0].Instances[0].PublicIpAddress' `
  --output text

Write-Host "✓ Public IP: $ip"
Write-Host "✓ Connect with: ssh -i tolling-llm-key.pem ec2-user@$ip"
Write-Host "✓ After 3 minutes: http://$ip`:3000"

# Save instance info
@{InstanceId=$instanceId; PublicIP=$ip} | ConvertTo-Json `
  | Set-Content -Path ./ec2-instance.json
```

---

## IMMEDIATE NEXT STEPS

1. **Choose Option A or B above**
2. **Launch instance** (2 minutes wait)
3. **SSH in** when instance is running
4. **Run deployment script** (3 minutes)
5. **Access app** at http://<PUBLIC_IP>:3000

---

## Timeline
- Launch 🚀: 2 minutes
- Deploy 🔧: 3 minutes  
- App Ready ✅: ~5 minutes total

---

## Troubleshooting SSH Connection

If `ssh` command not found on Windows:
```powershell
# Use PuTTY or Windows Terminal (recommended)
# Or use AWS Systems Manager Session Manager from console
```

If permission denied on .pem file:
```powershell
icacls tolling-llm-key.pem /grant:r "$($env:USERNAME):(F)"
icacls tolling-llm-key.pem /inheritance:r
```

---

## Check Deployment Status

Once SSH'd into instance:
```bash
# View logs
docker-compose logs -f

# Check services
docker-compose ps

# Test API
curl http://localhost:5000/api/health
```

---

**Ready to start?** 
- Hit refresh on AWS Console
- Or run the PowerShell commands above
- Need help with any step? Just ask!
