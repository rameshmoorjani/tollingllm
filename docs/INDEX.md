# Documentation Index

## 📚 Getting Started

- **[README.md](../README.md)** - Project overview and quick start
- **[SETUP_GUIDE.md](../SETUP_GUIDE.md)** - Initial local development setup

## 🚀 Deployment Guide

### AWS Deployment
- **[AWS_DEPLOYMENT_QUICK_START.md](guides/AWS_DEPLOYMENT_QUICK_START.md)** - ⭐ Start here for 5-minute AWS deployment
- **[AWS_DEPLOYMENT_APPRUNNER.md](guides/AWS_DEPLOYMENT_APPRUNNER.md)** - Detailed AppRunner setup
- **[DEPLOYMENT_SUMMARY.md](guides/DEPLOYMENT_SUMMARY.md)** - Final deployment checklist

### Security & Credentials
- **[AWS_CREDENTIALS_ROTATION.md](guides/AWS_CREDENTIALS_ROTATION.md)** - ⚠️ How to rotate exposed credentials
- **[AWS_SETUP_GUIDE.md](guides/AWS_SETUP_GUIDE.md)** - AWS account setup
- **[AWS_CREATE_CREDENTIALS.md](guides/AWS_CREATE_CREDENTIALS.md)** - Create IAM user and access keys

## 💻 Database & Setup

- **[DATA_SEEDING_GUIDE.md](guides/DATA_SEEDING_GUIDE.md)** - Load test data into MongoDB
- **[CREATE_IAM_USER_SIMPLE.md](guides/CREATE_IAM_USER_SIMPLE.md)** - AWS IAM user creation steps
- **[CREDENTIALS_GUIDE.md](guides/CREDENTIALS_GUIDE.md)** - Credential management best practices

## 🔧 AWS Integration

- **[AWS_BEDROCK_INTEGRATION.md](guides/AWS_BEDROCK_INTEGRATION.md)** - AWS Bedrock LLM setup
- **[AWS_CREATE_CREDENTIALS.md](guides/AWS_CREATE_CREDENTIALS.md)** - AWS credential setup

## 🐛 Troubleshooting

- **[ISSUE_RESOLUTION.md](guides/ISSUE_RESOLUTION.md)** - Common issues and fixes

## 📋 Folder Structure

```
TollingLLM/
├── docs/                          # 📚 All documentation
│   ├── guides/                    # Step-by-step guides
│   │   ├── AWS_*.md              # AWS-specific guides
│   │   ├── DEPLOYMENT_*.md       # Deployment guides
│   │   ├── DATA_*.md             # Data management
│   │   └── ISSUE_*.md            # Troubleshooting
│   └── architecture/             # Architecture diagrams
├── scripts/                       # 🔧 Automation scripts
│   ├── deployment/               # AWS deployment scripts
│   │   ├── deploy-to-apprunner.ps1
│   │   └── deploy-to-apprunner.sh
│   └── database/                 # Database utilities
├── backend/                       # 🔧 Backend code
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── frontend/                      # 🎨 Frontend code
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── docker/                        # 🐳 Container configs
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── Dockerfile.apprunner
├── docker-compose.yml             # Local development
└── README.md                      # Project overview
```

## 🚀 Quick Navigation

### I want to...

- **Run locally**: See [SETUP_GUIDE.md](../SETUP_GUIDE.md)
- **Deploy to AWS**: See [AWS_DEPLOYMENT_QUICK_START.md](guides/AWS_DEPLOYMENT_QUICK_START.md)
- **Rotate credentials**: See [AWS_CREDENTIALS_ROTATION.md](guides/AWS_CREDENTIALS_ROTATION.md)
- **Load test data**: See [DATA_SEEDING_GUIDE.md](guides/DATA_SEEDING_GUIDE.md)
- **Fix an issue**: See [ISSUE_RESOLUTION.md](guides/ISSUE_RESOLUTION.md)
- **Understand architecture**: See [architecture/](architecture/)

---

**Last Updated**: April 26, 2026
