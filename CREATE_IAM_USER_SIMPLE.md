# Create IAM User - Complete Step-by-Step Guide

## ✅ Step 1: Go to IAM Users Page

1. Go to: https://console.aws.amazon.com/iamv2/home#/users
2. Or search: **IAM** → **Users** 
3. Click orange **Create user** button

---

## ✅ Step 2: Enter User Name

**Page: "Specify user details"**

1. In the text box, type: `tollingllm-app`
2. Leave "Provide user access to AWS Management Console" UNCHECKED ✅
3. Click **Next** button

---

## ✅ Step 3: Attach Bedrock Permission

**Page: "Set permissions" (Step 3)**

**IMPORTANT:** On this page:
- You see 3 options for permissions
- **DO NOT** select "Add user to group"
- **DO** select "Attach policies directly" ← CLICK THIS

**After clicking "Attach policies directly":**

1. You'll see a **Search box** that says "Filter policies"
2. Type in search box: `bedrock`
3. Look at the list below
4. **Find and check:** `AmazonBedrockFullAccess`
   - It should have a checkbox on the left
   - Click the checkbox ✅

5. Click **Next** button

---

## ✅ Step 4: Review and Create

**Page: "Review and create"**

1. You'll see:
   - User name: `tollingllm-app`
   - Permissions: `AmazonBedrockFullAccess`

2. Click orange **Create user** button

✅ **User created successfully!**

---

## ✅ Step 5: Create Access Key

**After user is created, you'll see success message**

1. Click on your user name: `tollingllm-app`
2. Go to **Security credentials** tab (near the top)
3. Scroll down to **Access keys** section
4. Click **Create access key** button

**Choose use case:**
- Select: **Application running outside AWS**
- Click **Next**

**On next screen:**
- Description (optional): `TollingLLM Bedrock`
- Click **Create access key**

---

## ✅ Step 6: Copy Credentials

You'll see a screen showing:

```
Access key ID
AKIA...xxxxxxxxxxxxx

Secret access key
wJal...xxxxxxxxxxxxx
```

⚠️ **COPY THESE NOW** (you can only see once!)

---

## ✅ Step 7: Update Your .env File

Open: `c:\Users\rames\projects\TollingLLM\backend\.env`

Replace:
```env
AWS_ACCESS_KEY_ID=AKIA...xxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=wJal...xxxxxxxxxxxxx
```

Save the file.

---

## ✅ Step 8: Enable Bedrock Models

1. Go to: https://console.aws.amazon.com/bedrock/home
2. Or search: **Bedrock** in AWS console
3. Click **Model access** (left sidebar)
4. Click **Manage model access** button
5. Check these:
   - ✅ **Llama 3.1 8B Instruct** (RECOMMENDED)
   - ✅ **Mistral 7B Instruct** (Alternative)
6. Click **Save changes**
7. Wait 5-10 minutes for models to activate

---

## ✅ Step 9: Test

```bash
cd c:\Users\rames\projects\TollingLLM
docker-compose down
docker-compose up --build
```

Check logs for:
```
✅ AWS Bedrock Service initialized
📍 Region: us-east-1
📊 Model: meta.llama3-8b-instruct-v1:0
```

Open browser: http://localhost:3000/agent

Send a query → Should get response in **<1 second** ✅

---

## Troubleshooting

### ❌ Can't find "AmazonBedrockFullAccess"

**Try these:**
1. Make sure you clicked "Attach policies directly"
2. In search box, type: `bedrock` (not full name)
3. Or type: `bedrock*` (with asterisk)
4. Scroll down to see results
5. If still not found, check:
   - Your AWS account supports Bedrock
   - You're in a supported region (us-east-1, eu-west-1, etc.)

### ❌ Models not available

1. Go to **Bedrock** → **Model access**
2. Click **Manage model access**
3. Scroll down to find **Llama 3.1 8B Instruct**
4. If greyed out: Contact AWS support to enable Bedrock for your account
5. Some regions may not have all models - try `us-east-1`

### ❌ Still stuck?

1. Delete the user and try again
2. Make sure you're using root AWS account (not child account)
3. Verify email is confirmed

---

## Quick Checklist

- [ ] User created: `tollingllm-app`
- [ ] Permission: `AmazonBedrockFullAccess` attached
- [ ] Access Key created
- [ ] Access Key ID copied to `.env`
- [ ] Secret Access Key copied to `.env`
- [ ] Bedrock models enabled
- [ ] Docker running
- [ ] Tested at localhost:3000

**Done? Try the test at Step 9!**
