# TollingLLM Project Structure

Well-organized project directories for development, deployment, and documentation.

```
TollingLLM/
│
├── 📂 docs/                          ← 📚 All Documentation
│   ├── INDEX.md                      ← Start here to navigate docs
│   ├── guides/                       ← Step-by-step guides
│   │   ├── AWS_CREDENTIALS_ROTATION.md
│   │   ├── AWS_DEPLOYMENT_*.md       ← Deployment guides
│   │   ├── AWS_BEDROCK_INTEGRATION.md
│   │   ├── AWS_SETUP_GUIDE.md
│   │   ├── DATA_SEEDING_GUIDE.md
│   │   ├── ISSUE_RESOLUTION.md
│   │   └── DEPLOYMENT_SUMMARY.md
│   ├── architecture/                 ← Architecture diagrams
│   └── api/                          ← API documentation
│
├── 📂 scripts/                       ← 🔧 Automation & Utilities
│   ├── README.md                     ← Script guide
│   ├── deployment/                   ← AWS deployment
│   │   ├── deploy-to-apprunner.ps1  ← Windows (PowerShell)
│   │   └── deploy-to-apprunner.sh   ← Linux/macOS (Bash)
│   └── database/                     ← Database utilities (coming soon)
│
├── 📂 backend/                       ← 🔧 Backend Code
│   ├── src/
│   │   ├── server.ts                ← Entry point
│   │   ├── config/                  ← Configuration files
│   │   ├── controllers/             ← Request handlers
│   │   ├── middleware/              ← Express middleware
│   │   ├── routes/                  ← API endpoints
│   │   │   ├── health.ts
│   │   │   └── transactions.ts
│   │   ├── services/                ← Business logic
│   │   │   ├── chatAgentService.ts
│   │   │   ├── mongodbService.ts
│   │   │   └── bedrockService.ts
│   │   ├── socket/                  ← WebSocket handlers
│   │   └── types/                   ← TypeScript types
│   ├── package.json
│   └── tsconfig.json
│
├── 📂 frontend/                      ← 🎨 Frontend Code
│   ├── src/
│   │   ├── main.tsx                 ← Entry point
│   │   ├── App.tsx                  ← Main component
│   │   ├── components/              ← Reusable components
│   │   │   ├── ChatWindow.tsx
│   │   │   └── DataTable.tsx
│   │   ├── pages/                   ← Page components
│   │   │   ├── Agent.tsx
│   │   │   └── Browse.tsx
│   │   ├── styles/                  ← CSS files
│   │   ├── hooks/                   ← Custom React hooks
│   │   └── types/                   ← TypeScript types
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── 📂 docker/                        ← 🐳 Container Configs
│   ├── Dockerfile.backend            ← Backend container
│   ├── Dockerfile.frontend           ← Frontend container
│   └── Dockerfile.apprunner          ← AWS AppRunner production
│
├── 📂 src/                           ← Shared utilities (if needed)
│   └── config/
│
├── 📂 tests/                         ← ✅ Test files
│
├── 📚 Root Documentation
│   ├── README.md                     ← Project overview
│   ├── SETUP_GUIDE.md                ← Local development setup
│   ├── LICENSE
│   ├── .gitignore
│   └── .env.example                  ← Environment template
│
├── 🐳 Infrastructure
│   └── docker-compose.yml            ← Local development
│
└── 📋 Configuration
    ├── package.json                  ← Root-level scripts
    ├── package-lock.json
    └── .git/                         ← Version control
```

## 📚 Documentation Organization

### `docs/INDEX.md`
**Master index for all documentation. Start here!**
- Quick navigation links
- Document hierarchy
- "I want to..." quick links

### `docs/guides/`
**Step-by-step implementation guides**
- AWS setup and credentials
- Deployment procedures
- Data seeding
- Troubleshooting
- Issue resolutions

### `docs/architecture/`
**System design and architecture**
- Component diagrams
- Data flow
- API specifications (coming soon)

### `docs/api/`
**API documentation** (coming soon)
- REST endpoints
- WebSocket events
- Request/response examples

## 🔧 Scripts Organization

### `scripts/README.md`
**Guide to all automation scripts**

### `scripts/deployment/`
**AWS deployment automation**
- PowerShell: `deploy-to-apprunner.ps1` (Windows)
- Bash: `deploy-to-apprunner.sh` (Unix)

### `scripts/database/` *(coming soon)*
- Backup and restore utilities
- Data seeding scripts
- Database migrations

## 💻 Source Code Organization

### Backend Structure
```
backend/src/
├── server.ts              ← Express app setup
├── config/                ← Configuration loading
├── controllers/           ← Request handlers
├── middleware/            ← Express middleware
├── routes/                ← API route definitions
├── services/              ← Business logic & integrations
│   ├── chatAgentService.ts     ← LLM chat orchestration
│   ├── mongodbService.ts       ← Database operations
│   └── bedrockService.ts       ← AWS Bedrock integration
├── socket/                ← WebSocket handlers
└── types/                 ← TypeScript interfaces
```

### Frontend Structure
```
frontend/src/
├── App.tsx                ← Main component
├── main.tsx               ← React entry point
├── components/            ← Reusable UI components
│   ├── ChatWindow.tsx
│   └── DataTable.tsx
├── pages/                 ← Full-page components
│   ├── Agent.tsx          ← Chat agent page
│   └── Browse.tsx         ← Transaction browser
├── styles/                ← Global and component CSS
├── hooks/                 ← Custom React hooks
└── types/                 ← TypeScript definitions
```

## 🎯 Quick Navigation

### 🚀 I want to deploy to AWS
1. Read: `docs/guides/AWS_DEPLOYMENT_QUICK_START.md`
2. Run: `scripts/deployment/deploy-to-apprunner.ps1` (Windows)
3. Or: `scripts/deployment/deploy-to-apprunner.sh` (Unix)

### 🔐 I need to rotate credentials
1. Read: `docs/guides/AWS_CREDENTIALS_ROTATION.md`
2. Follow the step-by-step guide
3. Update `.env` file

### 🧪 I want to load test data
1. Read: `docs/guides/DATA_SEEDING_GUIDE.md`
2. Follow the data loading instructions

### 🐛 I'm troubleshooting an issue
1. Check: `docs/guides/ISSUE_RESOLUTION.md`
2. Or check: logs and error messages
3. Refer to specific AWS guide if AWS-related

### 👨‍💻 I'm developing locally
1. Read: `SETUP_GUIDE.md`
2. Follow local development setup
3. Use `docker-compose.yml` for services

## ✅ Best Practices

### File Naming
- `UPPERCASE_WITH_UNDERSCORES.md` for guides
- `lowercase-with-dashes.ts` for code files
- `PascalCase.tsx` for React components

### Documentation
- Every module has relevant docs link
- Guides start with "Quick Start"
- Real example commands included
- Troubleshooting section in each guide

### Scripts
- Both PowerShell and Bash versions when possible
- Colored output for readability
- Error handling with clear messages
- Help/usage documentation

### Code
- Types defined in types/ folders
- Services with clear separation of concerns
- Routes organized by domain
- Components match page hierarchy

## 📖 Reading Order

**For New Developers:**
1. README.md (overview)
2. SETUP_GUIDE.md (local setup)
3. docs/INDEX.md (documentation map)
4. Specific guide for your task

**For Deployment:**
1. docs/guides/AWS_DEPLOYMENT_QUICK_START.md
2. docs/guides/AWS_CREDENTIALS_ROTATION.md (security first!)
3. scripts/README.md (deployment scripts)
4. Run deployment script

**For Troubleshooting:**
1. docs/guides/ISSUE_RESOLUTION.md
2. Specific AWS guide if needed
3. Backend/frontend logs

## 🔄 Maintaining the Structure

When adding new files:
- Documentation → `docs/guides/` or appropriate subdirectory
- Deployment scripts → `scripts/deployment/`
- Database utilities → `scripts/database/`
- Code → Appropriate `backend/` or `frontend/` subdirectory
- Update `docs/INDEX.md` with links to new docs

---

**Last Reorganized**: April 26, 2026
**Documentation Status**: ✅ Complete and organized
**All scripts**: ✅ In proper directories
**Code**: ✅ Backend/frontend properly separated
