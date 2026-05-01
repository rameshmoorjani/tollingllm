# 🔧 Bedrock Token Limit Fix Guide

## Problem
You're seeing the error: **"Too many tokens, please wait before trying again."**

This means your AWS Bedrock service has hit one of these limits:
1. **Token quota exceeded** (daily/monthly limit)
2. **Rate limit exceeded** (too many concurrent requests)
3. **Provisioned throughput exceeded** (if using provisioned capacity)

---

## ✅ Quick Fixes (Try These First)

### Fix #1: Restart the Backend Service
The most common cause is a temporary service hiccup. Restart your Docker container:

```bash
# Stop the backend container
docker-compose down

# Start it again
docker-compose up -d backend

# Check logs
docker-compose logs -f backend
```

### Fix #2: Wait a Few Minutes
If you just started using Bedrock or made many requests:
- Wait 5-10 minutes for quota to reset
- Try the query again

### Fix #3: Ask a Simpler Question
Queries with too much context consume more tokens. Instead of asking about all transactions:

❌ **Too much context (uses 2000+ tokens):**
> "What is the total toll amount for all 10,000 transactions?"

✅ **Optimized (uses 500 tokens):**
> "What's my total toll amount this month?"

---

## 🔍 Detailed Diagnosis

### Step 1: Check Bedrock Quotas

Run the quota checker script:

```bash
cd TollingLLM
python check_bedrock_quotas.py
```

This will show:
- Available Bedrock models
- Current usage vs limits
- Which quotas need increase

### Step 2: Check AWS Console

1. Go to **AWS Console** → **Service Quotas**
2. Search for **"Bedrock"**
3. Look for these key quotas:
   - `Bedrock On-Demand Token Input Quotas`
   - `Bedrock On-Demand Token Output Quotas`
   - `Concurrent provisioned token throughput`

Check if any are **95%+ utilized**.

### Step 3: Check Backend Logs

```bash
docker-compose logs backend | grep -i "bedrock\|error\|rate"
```

Look for messages like:
- `Rate limited (429)`
- `Too many tokens`
- `quota`

---

## 🚀 Solutions

### Solution 1: Increase AWS Bedrock Quotas (Recommended)

1. **Go to AWS Service Quotas Console:**
   - https://console.aws.amazon.com/servicequotas

2. **Find Bedrock quotas:**
   - Search: `bedrock`
   - Select service: `Bedrock`

3. **For each limited quota:**
   - Click on the quota name
   - Click "Request quota increase"
   - Set new value (e.g., 10,000 if current is 1,000)
   - Submit request
   - Usually approved within 5 minutes

**Recommended quotas to increase:**
```
Bedrock On-Demand Token Input Quota: 10,000 → 100,000
Bedrock On-Demand Token Output Quota: 10,000 → 100,000
```

### Solution 2: Use a Smaller Model (Faster & Cheaper)

Edit `backend/.env`:

```bash
# Current (might be slow/costly)
BEDROCK_MODEL=meta.llama3-70b-instruct-v1:0

# Better for token limits
BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0

# Fastest (not recommended)
BEDROCK_MODEL=mistral.mistral-7b-instruct-v0:2
```

Then restart:
```bash
docker-compose down
docker-compose up -d backend
```

### Solution 3: Reduce Transaction Batch Size

The backend now limits queries to:
- **Last 100 transactions per query** (previously all)
- **Top 20 customers** (previously all)

This is already optimized but you can further adjust in [backend/src/services/chatAgentService.ts](backend/src/services/chatAgentService.ts#L70):

```typescript
// Line 85 - Reduce this number if still hitting limits
const limitedTransactions = transactions.slice(-50); // was -100
```

### Solution 4: Add Frontend Rate Limiting

Create `frontend/src/hooks/useRateLimit.ts`:

```typescript
export function useRateLimit(maxRequests = 5, windowMs = 60000) {
  const requestsRef = useRef<number[]>([]);

  return (callback: () => void) => {
    const now = Date.now();
    const recentRequests = requestsRef.current.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      const waitTime = Math.ceil((recentRequests[0] + windowMs - now) / 1000);
      alert(`Please wait ${waitTime}s before next query`);
      return;
    }

    requestsRef.current = [...recentRequests, now];
    callback();
  };
}
```

Use in ChatWindow:
```typescript
const sendQuery = useRateLimit(5, 60000); // 5 queries per minute
```

---

## 📊 Monitoring & Prevention

### Monitor Token Usage

Add logging to track token consumption:

```bash
# Check backend logs for timing info
docker-compose logs backend | grep "processing_time"

# Example output:
# ✅ Bedrock response received in 2500ms
```

### Set Up Alerts (Optional)

In AWS CloudWatch:
1. Go to **CloudWatch** → **Alarms**
2. Create alarm for token usage > 80% of quota
3. Set notification to your email

---

## 🆘 Still Not Working?

### Debug Steps

1. **Verify Bedrock is enabled:**
   ```bash
   aws bedrock list-foundation-models --region us-east-1
   ```

2. **Test Bedrock directly:**
   ```bash
   aws bedrock-runtime invoke-model \
     --model-id meta.llama3-8b-instruct-v1:0 \
     --region us-east-1 \
     --body '{"prompt":"Hello"}' \
     response.txt
   ```

3. **Check AWS credentials:**
   ```bash
   echo $AWS_ACCESS_KEY_ID
   echo $AWS_REGION
   ```

4. **Check backend environment:**
   ```bash
   docker-compose exec backend env | grep AWS
   docker-compose exec backend env | grep BEDROCK
   ```

### Docker Compose Override

Create `docker-compose.override.yml` to test different quotas:

```yaml
version: '3.8'
services:
  backend:
    environment:
      BEDROCK_MODEL: meta.llama3-8b-instruct-v1:0
      AWS_REGION: us-east-1
      # Add verbose logging
      DEBUG: "bedrock:*"
```

Then test:
```bash
docker-compose down && docker-compose up -d backend
docker-compose logs -f backend
```

---

## 📞 Support

If still experiencing issues:

1. **Check recent changes:**
   ```bash
   git log --oneline -5
   ```

2. **Check Docker logs:**
   ```bash
   docker-compose logs --tail=100 backend
   ```

3. **Check AWS CloudTrail:**
   - AWS Console → CloudTrail → Recent events
   - Filter by Bedrock API calls

4. **Contact AWS Support:**
   - AWS Console → Support Center
   - Create "Service Quota Request" case

---

## 📈 Expected Performance

With proper setup, you should see:
- ✅ Query response: 1-3 seconds
- ✅ Token limit errors: 0-1 per day (if hitting quota)
- ✅ Success rate: > 99%

If you're getting errors > 5% of the time, increase quotas further.
