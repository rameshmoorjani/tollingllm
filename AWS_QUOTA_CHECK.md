# AWS Bedrock Quota Diagnostic Guide

## Step 1: Check Your AWS Bedrock TPM Limits

Go to AWS Console:
1. **Login to AWS Console** → https://console.aws.amazon.com
2. Navigate to: **Service Quotas**
3. Search for: "**Bedrock**"
4. Look for these specific quotas:
   - `Batch Job Request Rate (requests per second)` 
   - `On-Demand Throughput (Tokens Per Minute) for Mistral models`
   - `On-Demand Throughput (Tokens Per Minute) for Llama models`
   - `Provisioned Model Throughput`

## Step 2: Document Your Current Limits

Copy the **Current quota value** for each:
```
Mistral TPM: _______
Llama TPM: _______
Request Rate (RPS): _______
```

## Step 3: Check Model Access

In AWS Console:
1. Navigate to: **Bedrock** → **Model Access**
2. Check if these models show "Access granted":
   - mistral.mistral-7b-instruct-v0:2
   - meta.llama3-8b-instruct-v1:0

## Step 4: Calculate Your Current Prompt Size

Current prompt size in bedrockService.ts:
- Existing prompt + transaction data
- Estimated tokens: 200-300 tokens per request

**If your TPM limit is only 1000:**
- You can only make 3-5 requests per minute
- If prompt uses 300 tokens, each request uses 300 TPM
- Hitting limit after a few requests

## Step 5: Request Quota Increase

If TPM is too low:
1. In **Service Quotas**, find your Bedrock TPM quota
2. Click on the quota → **Request quota increase**
3. Set new desired value (e.g., 10000 TPM)
4. Submit request (usually approved in 1-2 hours)

## Step 6: Verify the Error is TPM-Related

Once you share your current limits, we can:
1. Calculate exact TPM consumption per request
2. Determine if TPM is the limiting factor
3. Optimize prompt size or request rate if needed
4. Request appropriate quota increase
