# TollingLLM - Setup & Run Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Create Environment File

Copy this to `.env` in project root:

```env
# MongoDB
MONGODB_URI=mongodb://admin:password@localhost:27017/tolling_db?authSource=admin
MONGODB_DATABASE=tolling_db
MONGODB_COLLECTION=transactions

# AWS SageMaker (Get from AWS Console)
SAGEMAKER_ENDPOINT_NAME=tolling-llm-endpoint
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# API Configuration
NODE_ENV=development
API_PORT=5000
FRONTEND_URL=http://localhost:3000
```

### Step 2: Start with Docker Compose (Easiest)

```bash
cd c:\Users\rames\projects\TollingLLM
docker-compose up
```

**What this does:**
- ✅ Starts MongoDB on port 27017
- ✅ Starts Node.js backend on port 5000
- ✅ Starts React frontend on port 3000
- ✅ Automatically handles connections between services

**Wait for:** "✅ Connected to MongoDB" message in backend logs

**Then open:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/health

### Step 3: Access the Application

**Screen 1 - Browse Data:**
1. Go to http://localhost:3000
2. Click "📊 Browse Data"
3. You'll see transaction data (sample will be empty until you add test data)

**Screen 2 - Chat Agent:**
1. Click "💬 Chat Agent"
2. Enter Customer ID: `CUST001`
3. Type: "Summarize my tolling transactions"
4. See AI response stream in real-time

---

## 🔧 Manual Setup (If Docker not available)

### Backend Setup

```bash
cd c:\Users\rames\projects\TollingLLM\backend

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Start development server
npm run dev
```

**Expected output:**
```
🚀 TollingLLM Backend running on http://localhost:5000
💬 WebSocket: ws://localhost:5000
```

### Frontend Setup (New Terminal)

```bash
cd c:\Users\rames\projects\TollingLLM\frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Expected output:**
```
  VITE v5.0.8  ready in XXX ms

  ➜  Local:   http://localhost:3000/
```

### MongoDB Setup (New Terminal)

```bash
# Option 1: Using Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7.0

# Option 2: Local MongoDB (if installed)
mongod
```

---

## 📊 Add Sample Data to MongoDB

### Option 1: Using MongoDB Compass (GUI)

1. Download MongoDB Compass: https://www.mongodb.com/products/tools/compass
2. Connect: `mongodb://admin:password@localhost:27017`
3. Create database: `tolling_db`
4. Create collection: `transactions`
5. Insert sample document:

```json
{
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

### Option 2: Using MongoDB Shell

```bash
# Connect to MongoDB
mongosh mongodb://admin:password@localhost:27017

# Use database
use tolling_db

# Insert sample data
db.transactions.insertMany([
  {
    "customer_id": "CUST001",
    "tolltime": new Date("2024-04-10T10:30:00Z"),
    "tollstatus": "completed",
    "toll_point_name": "Bay Bridge Toll",
    "toll_amount": 5.50,
    "timezone": "America/Los_Angeles",
    "state": "CA",
    "connection_status": true
  },
  {
    "customer_id": "CUST001",
    "tolltime": new Date("2024-04-11T14:15:00Z"),
    "tollstatus": "completed",
    "toll_point_name": "Golden Gate Bridge",
    "toll_amount": 3.20,
    "timezone": "America/Los_Angeles",
    "state": "CA",
    "connection_status": true
  },
  {
    "customer_id": "CUST002",
    "tolltime": new Date("2024-04-12T09:00:00Z"),
    "tollstatus": "completed",
    "toll_point_name": "Toll Road 101",
    "toll_amount": 7.80,
    "timezone": "America/Los_Angeles",
    "state": "CA",
    "connection_status": false
  }
])

# Verify data
db.transactions.find()
```

---

## 🧪 Testing the Application

### Test Browse Screen

1. Go to http://localhost:3000/browse
2. You should see a table with transactions
3. Try filters:
   - **Customer ID:** CUST001
   - **Status:** completed
   - **Export:** Click "📥 Export CSV"

### Test Chat Agent

1. Go to http://localhost:3000/agent
2. Enter Customer ID: `CUST001`
3. Click "📊 Summarize All" quick button
4. Watch real-time response stream

**Example responses:**
```
"Customer CUST001 made 2 toll transactions totaling $8.70 
over the period. Most frequent location: Bay Bridge (50%). 
All transactions completed successfully."
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000 (Frontend)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Kill process on port 5000 (Backend)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Kill process on port 27017 (MongoDB)
netstat -ano | findstr :27017
taskkill /PID <PID> /F
```

### MongoDB Connection Failed

```bash
# Check if MongoDB is running
docker ps | grep mongodb

# If not, restart:
docker-compose restart mongodb

# Or manually:
docker run -d --name mongodb -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7.0
```

### Backend Not Connecting to MongoDB

```bash
# Check connection string in .env
# Should be: mongodb://admin:password@localhost:27017

# Test connection:
mongosh mongodb://admin:password@localhost:27017
```

### No Data in Browse Screen

1. Check MongoDB has data:
   ```bash
   mongosh mongodb://admin:password@localhost:27017
   use tolling_db
   db.transactions.countDocuments()
   ```

2. If count is 0, insert sample data (see Add Sample Data section above)

---

## 📝 API Testing with curl

```bash
# Get all transactions
curl http://localhost:5000/api/transactions

# Get specific customer
curl "http://localhost:5000/api/transactions?customer_id=CUST001"

# Search transactions
curl "http://localhost:5000/api/transactions/search?q=Bay Bridge"

# Health check
curl http://localhost:5000/api/health

# Export CSV
curl "http://localhost:5000/api/transactions/export/csv?customer_id=CUST001" -o export.csv
```

---

## ✅ Next Steps

1. **Run project** - Either Docker Compose or manual setup
2. **Add sample data** - Use MongoDB Compass or shell
3. **Test Browse screen** - View transactions from MongoDB
4. **Test Chat Agent** - Ask AI for summaries (after SageMaker setup)
5. **Push to GitHub** - Share your project publicly

---

## 🔑 AWS SageMaker Setup (Optional for Full Functionality)

For the chat agent to work with real AI summaries:

1. Go to AWS Console → SageMaker
2. Create or use existing endpoint
3. Get endpoint name
4. Add to `.env`:
   ```
   SAGEMAKER_ENDPOINT_NAME=your-endpoint-name
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   ```

Without SageMaker, chat will still respond but with mock responses.

---

**Status:** Ready to run! 🚀

Start with: `docker-compose up`
