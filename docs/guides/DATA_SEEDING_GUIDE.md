# Data Seeding Guide for TollingLLM

## Overview
The TollingLLM application requires sample transaction data in MongoDB to test the AWS Bedrock integration. Without data, the chat agent will return "No tolling transactions found" without calling Bedrock.

This guide explains how to seed sample data into the database.

## Prerequisites
- Docker Compose is running with MongoDB container active
- MongoDB is accessible at `localhost:27017` (or container hostname)
- MongoDB credentials are: `admin` / `password` (default in docker-compose.yml)

## Method 1: Using `mongosh` (Recommended)

### Single Command Insert
Connect to MongoDB and insert sample data:

```bash
docker exec tolling-llm-mongodb mongosh -u admin -p password --authenticationDatabase admin tolling_db --eval "db.transactions.insertMany([{customer_id:'CUST001',toll_amount:15.50,toll_point_name:'Highway 101 North',tolltime:new Date('2026-03-15T10:30:00'),tollstatus:'completed',connection_status:true},{customer_id:'CUST001',toll_amount:12.75,toll_point_name:'Highway 101 South',tolltime:new Date('2026-03-20T14:45:00'),tollstatus:'completed',connection_status:true},{customer_id:'CUST001',toll_amount:18.25,toll_point_name:'Bridge Crossing',tolltime:new Date('2026-03-25T09:00:00'),tollstatus:'completed',connection_status:true},{customer_id:'CUST002',toll_amount:16.00,toll_point_name:'Highway 101 North',tolltime:new Date('2026-03-10T11:20:00'),tollstatus:'completed',connection_status:true}])"
```

### Verify Data Was Inserted
```bash
docker exec tolling-llm-mongodb mongosh -u admin -p password --authenticationDatabase admin tolling_db --eval "db.transactions.find().pretty()"
```

### Check Transaction Count
```bash
docker exec tolling-llm-mongodb mongosh -u admin -p password --authenticationDatabase admin tolling_db --eval "db.transactions.countDocuments()"
```

## Method 2: Using a Script File

Create a file named `seed-data.js` with the following content:

```javascript
// Connect to MongoDB
db = db.getSiblingDB('tolling_db');

// Insert sample transactions
db.transactions.insertMany([
  {
    customer_id: 'CUST001',
    toll_amount: 15.50,
    toll_point_name: 'Highway 101 North',
    tolltime: new Date('2026-03-15T10:30:00'),
    tollstatus: 'completed',
    connection_status: true
  },
  {
    customer_id: 'CUST001',
    toll_amount: 12.75,
    toll_point_name: 'Highway 101 South',
    tolltime: new Date('2026-03-20T14:45:00'),
    tollstatus: 'completed',
    connection_status: true
  },
  {
    customer_id: 'CUST001',
    toll_amount: 18.25,
    toll_point_name: 'Bridge Crossing',
    tolltime: new Date('2026-03-25T09:00:00'),
    tollstatus: 'completed',
    connection_status: true
  },
  {
    customer_id: 'CUST002',
    toll_amount: 16.00,
    toll_point_name: 'Highway 101 North',
    tolltime: new Date('2026-03-10T11:20:00'),
    tollstatus: 'completed',
    connection_status: true
  }
]);

print('✅ Sample transactions inserted successfully!');
```

Then execute it:
```bash
docker cp seed-data.js tolling-llm-mongodb:/tmp/seed-data.js
docker exec tolling-llm-mongodb mongosh -u admin -p password --authenticationDatabase admin /tmp/seed-data.js
```

## Sample Data Schema

Each transaction document should have:

| Field | Type | Description |
|-------|------|-------------|
| `customer_id` | String | Unique customer identifier (e.g., "CUST001") |
| `toll_amount` | Number | Amount paid in USD (e.g., 15.50) |
| `toll_point_name` | String | Name of toll location |
| `tolltime` | Date | Timestamp of transaction |
| `tollstatus` | String | Status of transaction ("completed", "pending", etc.) |
| `connection_status` | Boolean | Whether connection was successful |

## Testing After Data Seeding

### Test via Chat Interface
1. Open browser to `http://localhost:3000/agent`
2. Type a query like: "What is the total toll amount I paid last month?"
3. The backend should:
   - Fetch transactions from MongoDB
   - Generate a prompt with transaction data
   - Call AWS Bedrock API
   - Return an AI-generated response with the toll amount

### Test via WebSocket (CLI)
Run the included test script:
```bash
node test-bedrock.js
```

Expected output:
```
✅ Connected to backend
📌 Session created: test-session
📤 Sending query...
✅ Server received message: { message_id: '...' }
📨 Chunk: [response chunks from Bedrock...]
✅ Agent response complete
   Message: [full response text]
   Length: 460
```

## Troubleshooting

### No transactions found
```bash
# Check if data was inserted
docker exec tolling-llm-mongodb mongosh -u admin -p password --authenticationDatabase admin tolling_db --eval "db.transactions.countDocuments()"
```

### MongoDB connection errors
1. Verify MongoDB container is running:
   ```bash
   docker ps | grep mongodb
   ```
2. Check MongoDB logs:
   ```bash
   docker logs tolling-llm-mongodb
   ```

### Empty Bedrock response
1. Check if transactions exist in database (see above)
2. Verify AWS credentials are set:
   ```bash
   docker exec tolling-llm-backend env | grep AWS
   ```
3. Check backend logs for errors:
   ```bash
   docker logs tolling-llm-backend --tail 100
   ```

## Adding More Sample Data

To add additional transactions:

```bash
docker exec tolling-llm-mongodb mongosh -u admin -p password --authenticationDatabase admin tolling_db --eval "db.transactions.insertOne({customer_id:'CUST003',toll_amount:25.00,toll_point_name:'Bridge Crossing',tolltime:new Date('2026-03-28T16:00:00'),tollstatus:'completed',connection_status:true})"
```

## Cleaning Data

To remove all transactions and start fresh:

```bash
# Empty the collection
docker exec tolling-llm-mongodb mongosh -u admin -p password --authenticationDatabase admin tolling_db --eval "db.transactions.deleteMany({})"

# Verify it's empty
docker exec tolling-llm-mongodb mongosh -u admin -p password --authenticationDatabase admin tolling_db --eval "db.transactions.countDocuments()"
```

## For Production

In production, populate transactions from your actual toll collection system:
1. Connect to production MongoDB
2. Import real transaction records from your data source
3. Ensure customer IDs match your system
4. Use appropriate date ranges for historical data queries
