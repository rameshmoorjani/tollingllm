#!/bin/bash
# AWS Bedrock Quota Diagnostic Script
# This script helps determine if you're hitting Daily Token Quota or TPM Rate Limit

echo "🔍 AWS Bedrock Rate Limit Diagnostic"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check AWS credentials
echo -e "${BLUE}Step 1: Checking AWS Credentials...${NC}"
if [ -z "$AWS_ACCESS_KEY_ID" ]; then
  echo -e "${RED}❌ AWS_ACCESS_KEY_ID not set${NC}"
  exit 1
fi
echo -e "${GREEN}✅ AWS credentials found${NC}"
echo ""

# Get current timestamp
TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S")
echo "Timestamp: $TIMESTAMP"
echo ""

# Test 1: Try a minimal request (smallest prompt)
echo -e "${BLUE}Step 2: Testing MINIMAL prompt (50 tokens estimate)...${NC}"
MINIMAL_RESPONSE=$(aws bedrock-runtime invoke-model \
  --model-id "mistral.mistral-7b-instruct-v0:2" \
  --region us-east-1 \
  --content-type "application/json" \
  --body '{"prompt":"[INST] What is 2+2? [/INST]","max_tokens":100,"temperature":0.7}' \
  --output text \
  --query 'body' 2>&1)

if echo "$MINIMAL_RESPONSE" | grep -q "ThrottlingException\|Rate"; then
  echo -e "${RED}❌ MINIMAL request FAILED with rate limit${NC}"
  echo "Error: $MINIMAL_RESPONSE"
  echo ""
  echo -e "${YELLOW}⚠️  DIAGNOSIS: Your TPM Rate Limit is EXTREMELY LOW${NC}"
  echo "   Even a 50-token request is hitting the limit."
  echo "   This means your free tier TPM quota is severely restricted."
  exit 1
else
  echo -e "${GREEN}✅ MINIMAL request succeeded${NC}"
fi
echo ""

# Test 2: Try a medium request (300 tokens estimate)
echo -e "${BLUE}Step 3: Testing MEDIUM prompt (300 tokens estimate)...${NC}"

MEDIUM_PROMPT="[INST] Analyze the following transaction data and provide a summary:
Customer: CUST001
Transactions: 5 total
Toll Points: Exit 42, Mile Marker 25, Route 495
Total Amount: \$28.00
Average: \$5.60 per transaction
Status: All completed

Provide a brief analysis. [/INST]"

MEDIUM_RESPONSE=$(aws bedrock-runtime invoke-model \
  --model-id "mistral.mistral-7b-instruct-v0:2" \
  --region us-east-1 \
  --content-type "application/json" \
  --body "{\"prompt\":\"$MEDIUM_PROMPT\",\"max_tokens\":200,\"temperature\":0.7}" \
  --output text \
  --query 'body' 2>&1)

if echo "$MEDIUM_RESPONSE" | grep -q "ThrottlingException\|Rate"; then
  echo -e "${RED}❌ MEDIUM request FAILED with rate limit${NC}"
  echo "Error: $MEDIUM_RESPONSE"
  echo ""
  echo -e "${YELLOW}⚠️  DIAGNOSIS: Your TPM Rate Limit is LOW (probably 1000-5000)${NC}"
  echo "   Medium requests (300 tokens) exceed your limit."
  exit 1
else
  echo -e "${GREEN}✅ MEDIUM request succeeded${NC}"
fi
echo ""

# Test 3: Query AWS Service Quotas for actual TPM value
echo -e "${BLUE}Step 4: Checking AWS Service Quotas...${NC}"
echo ""

QUOTAS=$(aws service-quotas list-service-quotas \
  --service-code bedrock \
  --region us-east-1 \
  --output json 2>&1)

if [ $? -eq 0 ]; then
  echo "Current Service Quotas for Bedrock:"
  echo "-----------------------------------"
  
  # Extract Mistral TPM
  MISTRAL_TPM=$(echo "$QUOTAS" | grep -A 5 "Mistral.*Throughput" | grep "Value" | head -1 | grep -o '[0-9]*' | head -1)
  echo "Mistral TPM: $MISTRAL_TPM"
  
  # Extract Llama TPM
  LLAMA_TPM=$(echo "$QUOTAS" | grep -A 5 "Llama.*Throughput" | grep "Value" | head -1 | grep -o '[0-9]*' | head -1)
  echo "Llama TPM: $LLAMA_TPM"
  
  # Extract Request Rate
  REQUEST_RATE=$(echo "$QUOTAS" | grep -A 5 "Request Rate" | grep "Value" | head -1 | grep -o '[0-9]*' | head -1)
  echo "Request Rate (RPS): $REQUEST_RATE"
  echo ""
else
  echo -e "${YELLOW}⚠️  Could not query Service Quotas. Using AWS Console to check manually.${NC}"
  echo ""
  echo "Manual steps:"
  echo "1. Go to https://console.aws.amazon.com/servicequotas/home"
  echo "2. Search for 'bedrock'"
  echo "3. Look for quotas mentioning 'Tokens Per Minute' or 'Throughput'"
  echo "4. Note the 'Current quota value'"
fi
echo ""

# Step 5: Determine the issue
echo -e "${BLUE}Step 5: ROOT CAUSE ANALYSIS${NC}"
echo "======================================"
echo ""

# Check error pattern from logs
echo "Checking error pattern from application logs..."
echo ""

# Count how many requests failed in last hour
ERRORS_LAST_HOUR=$(docker-compose logs backend --tail=100 2>&1 | grep -c "rate limit\|ThrottlingException\|Too many requests")

if [ "$ERRORS_LAST_HOUR" -gt 5 ]; then
  echo -e "${RED}Many errors in last 100 log lines ($ERRORS_LAST_HOUR errors)${NC}"
  echo -e "${YELLOW}LIKELY CAUSE: Daily Token Quota is exhausted${NC}"
  echo ""
  echo "Evidence:"
  echo "  - Multiple requests failing"
  echo "  - Suggests all requests consuming from same daily pool"
  echo "  - Once daily quota exhausted, ALL requests fail"
else
  echo -e "${YELLOW}Few errors in logs ($ERRORS_LAST_HOUR errors)${NC}"
  echo -e "${GREEN}LIKELY CAUSE: TPM Rate Limit (not daily quota)${NC}"
  echo ""
  echo "Evidence:"
  echo "  - Isolated errors hours apart"
  echo "  - Suggesting per-minute limits reached"
  echo "  - Some requests succeed, some fail"
fi
echo ""

# Summary
echo -e "${BLUE}📊 SUMMARY${NC}"
echo "=========="
if [ "$ERRORS_LAST_HOUR" -gt 5 ]; then
  echo -e "${RED}MOST LIKELY: Daily Token Quota Exhausted${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Request quota increase from AWS"
  echo "2. Go to https://console.aws.amazon.com/servicequotas/home"
  echo "3. Search for 'Bedrock'"
  echo "4. Find 'On-Demand Throughput (Tokens Per Minute)'"
  echo "5. Click and request increase to 10000+ TPM"
else
  echo -e "${YELLOW}MOST LIKELY: TPM Rate Limit Too Low${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Reduce prompt size (fewer transactions)"
  echo "2. Increase delay between requests (slower request rate)"
  echo "3. Request TPM quota increase to 10000+"
fi
echo ""
