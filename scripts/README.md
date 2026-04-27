# Scripts Directory

Automation and utility scripts for TollingLLM development and deployment.

## 📂 Structure

```
scripts/
├── deployment/          # AWS deployment automation
│   ├── deploy-to-apprunner.ps1    # Windows deployment (PowerShell)
│   └── deploy-to-apprunner.sh     # macOS/Linux deployment (Bash)
├── database/            # Database utilities (coming soon)
├── deploy_sagemaker.py  # AWS SageMaker deployment
└── deploy_simple.py     # Simple deployment utility
```

## 🚀 Deployment Scripts

### deploy-to-apprunner.ps1 (Windows)

**Purpose**: One-click deployment to AWS AppRunner

**Usage**:
```powershell
cd c:\Users\rames\projects\TollingLLM
.\scripts\deployment\deploy-to-apprunner.ps1
```

**What it does**:
- Creates ECR repository
- Builds Docker image
- Pushes to ECR
- Creates AppRunner service
- Waits for deployment
- Returns public URL

**Prerequisites**:
- AWS CLI configured
- Docker installed
- `.env` file with valid AWS credentials

**Time**: ~5-10 minutes

---

### deploy-to-apprunner.sh (macOS/Linux)

**Purpose**: One-click deployment to AWS AppRunner (same as PowerShell version)

**Usage**:
```bash
cd /path/to/TollingLLM
chmod +x scripts/deployment/deploy-to-apprunner.sh
./scripts/deployment/deploy-to-apprunner.sh
```

**What it does**: (Same as PowerShell version)

---

## 📖 Before Running Deployment

1. **Rotate AWS Credentials** (CRITICAL!)
   - See: [docs/guides/AWS_CREDENTIALS_ROTATION.md](../docs/guides/AWS_CREDENTIALS_ROTATION.md)
   
2. **Update .env file**
   - Copy `.env.example` to `.env`
   - Add your NEW AWS credentials

3. **Verify Docker**
   ```bash
   docker --version
   ```

4. **Verify AWS CLI**
   ```bash
   aws --version
   aws sts get-caller-identity  # Should show your AWS account
   ```

---

## 📊 Deployment Script Flow

```
┌─────────────────────────────┐
│  Run deployment script      │
└──────────────┬──────────────┘
               │
       ┌───────▼────────┐
       │ Create ECR     │
       │ repository     │
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │ Build Docker   │
       │ image          │
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │ Push to ECR    │
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │ Create         │
       │ AppRunner      │
       │ service        │
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │ Wait for       │
       │ deployment     │
       │ (2-5 min)      │
       └───────┬────────┘
               │
       ┌───────▼────────────────────┐
       │ 🎉 Return Public URL       │
       │ https://xxxx.awsapp...com  │
       └────────────────────────────┘
```

---

## 🔧 Database Scripts (Coming Soon)

Scripts for database operations (backup, restore, seed):
- `backup-mongodb.sh` - Backup database
- `restore-mongodb.sh` - Restore from backup
- `seed-data.sh` - Load test data

---

## 📝 Adding New Scripts

When adding new scripts:

1. Create in appropriate subfolder (`deployment/`, `database/`, etc.)
2. Add `.ps1` for Windows and `.sh` for Unix (if applicable)
3. Add usage instructions here
4. Add to git: `git add scripts/`
5. Update this README

---

## ❓ Troubleshooting

### "Command not found" (Bash)
```bash
chmod +x scripts/deployment/deploy-to-apprunner.sh
```

### Permission denied (PowerShell)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Script fails with AWS errors
```bash
# Verify credentials
aws sts get-caller-identity

# Check AWS CLI version
aws --version

# Update AWS CLI if needed
pip install --upgrade awscli
```

---

**For detailed deployment guide**: See [docs/guides/AWS_DEPLOYMENT_QUICK_START.md](../docs/guides/AWS_DEPLOYMENT_QUICK_START.md)
