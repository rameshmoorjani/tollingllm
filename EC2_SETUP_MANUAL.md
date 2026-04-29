# EC2 Manual Deployment Guide

## Quick Start: Launch EC2 Instance

### Step 1: Open AWS Console
1. Go to **AWS Console** → **EC2** → **Instances**
2. Click **Launch Instances**

### Step 2: Configure Instance

**Name:** tolling-llm-app

**AMI:** Amazon Linux 2 (free tier eligible)

**Instance Type:** t3.medium
- Use t3.small for testing, t3.medium for production

**Key Pair:**
- Click "Create new key pair"
- Name: `tolling-llm-key`
- Type: RSA
- Format:  .pem
- **Save the .pem file securely!**

**Network Settings:**
- VPC: Default VPC
- Auto-assign Public IP: Enable
- Security Group: Create new
  - Name: `tolling-llm-sg`
  - Add Inbound Rules:
    - SSH (22) from 0.0.0.0/0
    - HTTP (80) from 0.0.0.0/0
    - Custom TCP (5000) from 0.0.0.0/0
    - Custom TCP (3000) - Optional, for frontend

**IAM Instance Profile:**
- Create or use existing IAM role with permissions for:
  - AWS Bedrock (`bedrock:InvokeModel`)
  - EC2 (for basic operation)
  - CloudWatch (for logging)

**Storage:** 
- 30 GB gp3 (free tier uses 30GB)

### Step 3: Launch and Wait
- Click **Launch Instance**
- Wait 1-2 minutes for instance to start
- Note the Public IP address

### Step 4: Connect to Instance

#### On Windows:
```powershell
# Change permission on key file
icacls tolling-llm-key.pem /grant:r "$($env:USERNAME):(F)"
icacls tolling-llm-key.pem /inheritance:r

# Connect
ssh -i tolling-llm-key.pem ec2-user@<PUBLIC_IP>
```

#### On macOS/Linux:
```bash
chmod 600 tolling-llm-key.pem
ssh -i tolling-llm-key.pem ec2-user@<PUBLIC_IP>
```

### Step 5: Deploy Application

Once connected via SSH:

```bash
# Option A: Run deployment script from repository
cd ~
git clone https://github.com/ramesaliyev/TollingLLM.git
cd TollingLLM
bash deploy-on-ec2.sh

# Option B: Manual deployment
./deploy-on-ec2.sh
```

The script will:
1. Update system packages
2. Install Docker & Docker Compose
3. Clone TollingLLM repository
4. Create production .env file
5. Build and start services
6. Display application URLs

### Step 6: Access Application

After 2-3 minutes:
- **Frontend:** http://<PUBLIC_IP>:3000
- **Backend API:** http://<PUBLIC_IP>:5000
- **Health:** http://<PUBLIC_IP>:5000/api/health

### Step 7: Monitor Services

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f mongodb

# Check status
docker-compose ps
```

---

## Post-Deployment

### Get Elastic IP (Static IP)

To keep the same IP even if you stop/start:

```bash
# From AWS Console → EC2 → Elastic IPs
# Allocate new address → Associate with instance

# Or via AWS CLI:
aws ec2 allocate-address --domain vpc
aws ec2 associate-address --instance-id <INSTANCE_ID> --allocation-id <ALLOCATION_ID>
```

### Custom Domain Setup

```bash
# Get instance public IP
PUBLIC_IP=$(ec2-metadata --public-ipv4 | cut -d" " -f2)
echo $PUBLIC_IP
```

Then in your DNS provider (Route53, Namecheap, etc.):
- Add A record pointing to your Elastic IP
- Update FRONTEND_URL in .env:
  ```
  FRONTEND_URL=https://yourdomain.com
  ```

### Update Application

```bash
cd /opt/tolling-llm
git pull
docker-compose pull
docker-compose up -d
```

### Auto-Start on Reboot

```bash
# Create systemd service
sudo tee /etc/systemd/system/tolling-llm.service > /dev/null << EOF
[Unit]
Description=TollingLLM Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/opt/tolling-llm/docker-compose up -d
ExecStop=/opt/tolling-llm/docker-compose down
WorkingDirectory=/opt/tolling-llm
RemainAfterExit=yes
User=ec2-user

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable tolling-llm
```

---

## Troubleshooting

### Can't Connect via SSH
- Verify security group allows SSH (port 22)
- Check key pair permissions: `chmod 600 tolling-llm-key.pem`
- Wait 1-2 minutes after launch
- Check instance status is "Running"

### Application Not Responding
```bash
# Check if containers are running
docker-compose ps

# View logs for errors
docker-compose logs -f

# Restart services
docker-compose restart

# Check port is open
netstat -tulpn | grep 5000
```

### MongoDB Connection Error
```bash
# Check MongoDB container
docker-compose logs mongodb

# Test connection
docker exec -it tolling-llm-mongodb mongosh -u admin -p password

# Restart MongoDB
docker-compose restart mongodb
```

### Port Already in Use
```bash
# Find what's using port 5000
sudo lsof -i :5000

# Kill process if needed
sudo kill <PID>

# Or change port in .env and rebuild
```

### Out of Disk Space
```bash
# Check usage
df -h

# Clean docker
docker system prune -a
docker volume prune
```

---

## Cost Estimation

| Instance Type | Monthly Cost | Use Case |
|---|---|---|
| t3.small | $10-15 | Development/Testing |
| t3.medium | $30-35 | Production (Recommended) |
| t3.large | $60-70 | High traffic |

Additional costs:
- Data transfer: minimal within region
- Elastic IP: $0.005/hour when not in-use, free when associated
- EBS storage: $0.10/GB-month

---

## Security Best Practices

1. **Restrict Security Group**
   ```
   - SSH (22): Only your IP, not 0.0.0.0/0
   - HTTP (80): 0.0.0.0/0 (public)
   - API (5000): 0.0.0.0/0 (public)
   ```

2. **Use Secrets Manager for MongoDB**
   - Store password in AWS Secrets Manager
   - Reference in .env

3. **Enable CloudWatch Logs**
   ```bash
   docker-compose exec backend env LOG_LEVEL=debug
   ```

4. **Regular Backups**
   ```bash
   # Backup MongoDB
   docker exec tolling-llm-mongodb mongodump -u admin -p password -o /tmp/backup
   ```

---

## Cleanup (Stop Costs)

```bash
# Stop instance (costs minimal storage)
aws ec2 stop-instances --instance-ids <INSTANCE_ID>

# Terminate instance (delete everything)
aws ec2 terminate-instances --instance-ids <INSTANCE_ID>

# Release Elastic IP
aws ec2 release-address --allocation-id <ALLOCATION_ID>

# Delete security group (wait 5 mins after terminate)
aws ec2 delete-security-group --group-name tolling-llm-sg
```

---

## Next Steps

1. ✅ Launch EC2 instance
2. ✅ Run deploy-on-ec2.sh
3. ✅ Verify application is accessible
4. ✅ Test API endpoints
5. ⏳ (Optional) Set up custom domain
6. ⏳ (Optional) Enable auto-scaling
7. ⏳ (Optional) Set up monitoring alerts
