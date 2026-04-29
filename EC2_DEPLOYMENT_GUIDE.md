# EC2 EC2 Deployment Instructions

## Prerequisites
- AWS Account with EC2 and IAM permissions
- AWS CLI v2 configured with credentials
- PowerShell (for running deployment script)
- Git installed on your machine

## Step 1: Prepare Repository for Deployment

Make sure your repository is ready:
```bash
git add .
git commit -m "Prepare for EC2 deployment"
git push
```

## Step 2: Run EC2 Deployment Script

```powershell
cd C:\Users\rames\projects\TollingLLM
.\scripts\deployment\deploy-to-ec2.ps1 -InstanceType t3.medium -KeyPairName tolling-llm-key -Region us-east-1
```

### Available Parameters:
- `-InstanceType`: EC2 instance type (default: t3.medium)
  - Use `t3.small` for dev/testing
  - Use `t3.medium` or `t3.large` for production
- `-KeyPairName`: Name of EC2 key pair (default: tolling-llm-key)
- `-Region`: AWS region (default: us-east-1)

## Step 3: Monitor Instance Deployment

The script will:
1. Create IAM role with Bedrock permissions
2. Create security group with necessary ports
3. Generate/retrieve SSH key pair
4. Launch EC2 instance with user data script
5. Application starts automatically via Docker Compose

**Output**: The script saves instance details to `ec2-instance.json`

## Step 4: Access Your Application

After deployment (2-3 minutes for initialization):

### Frontend (React App):
```
http://<PUBLIC_IP>:3000
```

### Backend API:
```
http://<PUBLIC_IP>:5000
```

### Check Logs:
```bash
ssh -i tolling-llm-key.pem ec2-user@<PUBLIC_IP>
cd /opt/tolling-llm
docker-compose logs -f
```

## Step 5: Custom Domain Setup (Optional)

To use a custom domain like `tolling-llm.yourdomain.com`:

1. Get the Elastic IP:
   ```
   aws ec2 allocate-address --domain vpc --region us-east-1
   ```

2. Associate it with your instance:
   ```
   aws ec2 associate-address --instance-id <INSTANCE_ID> --allocation-id <ALLOCATION_ID>
   ```

3. Update your DNS records to point to the Elastic IP

4. Update CORS in backend (if needed):
   ```
   FRONTEND_URL=https://yourdomain.com
   ```

## Troubleshooting

### Application Not Starting
```bash
ssh -i tolling-llm-key.pem ec2-user@<PUBLIC_IP>
docker-compose logs backend
docker-compose ps
```

### MongoDB Connection Issues
```bash
# Check MongoDB is running
docker-compose logs mongodb

# Test connection
docker exec tolling-llm-mongodb mongosh -u admin -p password
```

### Port Already in Use
The security group allows:
- SSH (22)
- HTTP (80)
- HTTPS (443)
- Custom port (5000)

Modify security group rules in AWS Console if needed.

## Updating Application

To deploy new code:
```bash
ssh -i tolling-llm-key.pem ec2-user@<PUBLIC_IP>
cd /opt/tolling-llm
git pull
docker-compose pull
docker-compose up -d
```

## Monitoring

### CloudWatch Metrics:
- Navigate to CloudWatch in AWS Console
- View EC2 instance metrics (CPU, Network, Memory)

### Docker Logs:
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f mongodb
```

## Cost Estimation

- **t3.medium**: ~$30-35/month
- **t3.large**: ~$60-70/month
- **Data transfer**: Minimal for regional traffic
- **MongoDB storage**: Included in instance

## Cleanup

To delete everything and stop costs:
```powershell
# Get instance ID from ec2-instance.json
$instanceId = (Get-Content ec2-instance.json | ConvertFrom-Json).InstanceId

# Terminate instance
aws ec2 terminate-instances --instance-ids $instanceId --region us-east-1

# Delete security group (wait 5 minutes first)
aws ec2 delete-security-group --group-name tolling-llm-sg

# Delete IAM role
aws iam delete-role-policy --role-name TollingLLMEC2Role --policy-name BedrockAccess
aws iam remove-role-from-instance-profile --instance-profile-name TollingLLMEC2Profile --role-name TollingLLMEC2Role
aws iam delete-instance-profile --instance-profile-name TollingLLMEC2Profile
aws iam delete-role --role-name TollingLLMEC2Role
```

## Production Checklist

- [ ] Run deployment script
- [ ] Verify application is running at public IP
- [ ] Test MongoDB connection
- [ ] Test backend API endpoints
- [ ] Test frontend loads
- [ ] Check CloudWatch logs
- [ ] Allocate and associate Elastic IP (for static IP)
- [ ] Set up custom domain (optional)
- [ ] Configure backups for MongoDB (optional)
- [ ] Set up monitoring alerts (optional)
