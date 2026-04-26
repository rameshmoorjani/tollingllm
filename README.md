# TollingLLM - Node.js Full-Stack Application

AI-Powered Tolling Transaction Dashboard & Chat Agent built with Node.js+ Express, React + TypeScript, MongoDB, and AWS SageMaker.

## 🎯 Features

**Screen 1: Browse Data**
- 📊 View all tolling transactions from MongoDB
- 🔍 Filter by customer, status, date range
- 💾 Export as CSV
- 📱 Responsive data table with pagination

**Screen 2: Chat Agent** 
- 💬 Real-time chat with AI agent
- 🔄 WebSocket streaming responses
- ❓ Quick query examples
- 📈 Transaction summarization
- 🤖 SageMaker LLM integration

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express.js
- TypeScript
- MongoDB
- Socket.IO (WebSocket)
- AWS SageMaker SDK

**Frontend:**
- React 18
- TypeScript
- Vite
- Socket.IO Client
- CSS3

**Infrastructure:**
- Docker & Docker Compose
- MongoDB
- AWS SageMaker Endpoints

## 🚀 Quick Start

### Prerequisites
```
Node.js 18+
Docker & Docker Compose
MongoDB (includes with Docker)
AWS Account (SageMaker endpoint)
```

### Installation

**Option 1: Docker Compose (Recommended)**
```bash
# Clone the project
cd TollingLLM

# Create .env file
cp backend/.env.example .env

# Edit .env with your AWS credentials
nano .env

# Start all services
docker-compose up
```

**Option 2: Manual Setup**
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# MongoDB (new terminal)
mongod
```

### Access Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **MongoDB:** mongodb://localhost:27017

## 📁 Project Structure

```
TollingLLM/
├── backend/                      # Node.js + Express API
│   ├── src/
│   │   ├── server.ts            # Express app entry
│   │   ├── routes/              # API endpoints
│   │   │   ├── transactions.ts  # Browse data routes
│   │   │   └── health.ts        # Health check
│   │   ├── services/            # Business logic
│   │   │   ├── mongodbService.ts
│   │   │   ├── sagemakerService.ts
│   │   │   └── chatAgentService.ts
│   │   ├── socket/              # WebSocket handlers
│   │   │   └── socketHandlers.ts
│   │   ├── config/              # Configuration
│   │   └── types/               # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/                     # React + TypeScript UI
│   ├── src/
│   │   ├── pages/               # Screen components
│   │   │   ├── Browse.tsx       # Data browsing
│   │   │   └── Agent.tsx        # Chat interface
│   │   ├── components/          # Reusable components
│   │   │   ├── DataTable.tsx
│   │   │   └── ChatWindow.tsx
│   │   ├── styles/              # CSS modules
│   │   ├── App.tsx              # Main app
│   │   └── main.tsx             # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
│
├── docker/                       # Docker configuration
│   ├── docker-compose.yml       # Compose file
│   ├── Dockerfile.backend       # Backend image
│   └── Dockerfile.frontend      # Frontend image
│
├── README.md
├── LICENSE
└── .gitignore
```

## 🔌 API Endpoints

### Browse Transactions
```
GET /api/transactions
  ?customer_id=CUST001
  &status=completed
  &date_from=2024-04-01
  &date_to=2024-04-30
  &page=1
  &limit=20
```

### Search
```
GET /api/transactions/search?q=Bay Bridge
```

### Export CSV
```
GET /api/transactions/export/csv?customer_id=CUST001
```

### Health Check
```
GET /api/health
```

## 💬 WebSocket Events

### Chat Agent Events
```javascript
// Client sends query
socket.emit('send_query', {
  session_id: 'xyz',
  customer_id: 'CUST001',
  message: 'Summarize my tolling transactions'
})

// Server streams response
socket.on('agent_chunk', (data) => {
  // Receive text chunks as they're generated
})

socket.on('agent_complete', (data) => {
  // Receive full response
})
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test

# Lint (both)
npm run lint
```

## 📝 Environment Configuration

**Create `.env` in project root:**
```
# MongoDB
MONGODB_URI=mongodb://admin:password@mongodb:27017/tolling_db?authSource=admin
MONGODB_DATABASE=tolling_db
MONGODB_COLLECTION=transactions

# AWS SageMaker
SAGEMAKER_ENDPOINT_NAME=your-endpoint-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# API
API_PORT=5000
FRONTEND_URL=http://localhost:3000
```

## 🚢 Deployment

### Docker Compose Production
```bash
docker-compose -f docker-compose.yml up -d
```

### AWS ECS / Lambda
```bash
# Build and push images
docker build -t tolling-llm-backend:latest ./backend
docker push your-registry/tolling-llm-backend:latest
```

## ⚠️ Important Disclaimer

**POC/Development Use Only**

This is a proof-of-concept for demonstrating:
- Real-time chat with AI agents
- MongoDB integration
- AWS SageMaker endpoint calling
- Full-stack Node.js + React development

**For Production Use, Add:**
- ✅ User authentication & authorization
- ✅ Rate limiting & DDoS protection
- ✅ Input validation & sanitization
- ✅ Error handling & logging
- ✅ Monitoring & alerting
- ✅ Data encryption (TLS)
- ✅ Database backups
- ✅ API documentation

## 📊 Sample Data

Sample MongoDB documents:
```json
{
  "_id": ObjectId,
  "customer_id": "CUST001",
  "tolltime": "2024-04-10T10:30:00Z",
  "tollstatus": "completed",
  "toll_point_name": "Bay Bridge Toll",
  "toll_amount": 5.50,
  "timezone": "America/Los_Angeles",
  "state": "CA",
  "connection_status": true,
  "created_at": "2024-04-10T10:30:00Z"
}
```

## 📄 License

MIT License - See LICENSE file

## 🤝 Contributing

See CONTRIBUTING.md for guidelines

---

**Status:** POC Development | **Version:** 1.0.0 | **Last Updated:** April 2026
