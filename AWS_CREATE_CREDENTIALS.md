# How to Create AWS Access Key & Secret in AWS Console

## Step 1: Sign Into AWS Console

1. Go to https://console.aws.amazon.com
2. Sign in with your AWS account
3. You'll see the AWS Management Console

---

## Step 2: Go to IAM (Identity & Access Management)

1. In the top search bar, type: **IAM**
2. Click on **IAM** from the dropdown
3. You'll see the IAM Dashboard

---

## Step 3: Create an IAM User (Recommended for Security)

### Option A: Create New User (Better for Production)

1. Left sidebar → Click **Users**
2. Click **Create user** button (orange button)
3. User name: type `tollingllm-app` (or any name)
4. Click **Next** button

5. On "Set permissions" page:
   - Click **Attach policies directly**
   - Search box: type `AmazonBedrockFullAccess`
   - ✅ Check the box next to it
   - Click **Next** button

6. Click **Create user** button
7. Success! User created

---

## Step 4: Create Access Key for Your User

### After Creating User:

1. You'll see the user in the Users list
2. Click on your user name: `tollingllm-app`
3. Go to **Security credentials** tab
4. Scroll down to "Access keys" section
5. Click **Create access key** button

**Select use case:**
- Choose: **Application running outside AWS**
- Click **Next**

**Add description (optional):**
- Type: `TollingLLM Bedrock Access`
- Click **Create access key**

---

## Step 5: Copy Your Credentials (DO THIS IMMEDIATELY!)

You'll see a success screen with:

```
Access Key ID:
AKIA...xxxxxxxxxxxxx

Secret Access Key:
wJal...xxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **Important:** You can only see the secret once! Copy both now:

### Copy to Your .env File:

1. Copy **Access Key ID** → Paste into your `.env`:
   ```
   AWS_ACCESS_KEY_ID=AKIA...xxxxxxxxxxxxx
   ```

2. Copy **Secret Access Key** → Paste into your `.env`:
   ```
   AWS_SECRET_ACCESS_KEY=wJal...xxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. Click **Done** (or close the page)

---

## Step 6: Verify Bedrock is Enabled

1. Go to **Bedrock** (search in top bar)
2. Left sidebar → **Model access**
3. Click **Manage model access** button
4. Check these models:
   - ✅ **Llama 3.1 8B Instruct** (Recommended)
   - ✅ **Mistral 7B Instruct** (Alternative)
5. Click **Save changes**
6. Wait 5-10 minutes for models to activate

---

## Final .env File Example

After copying credentials, your `.env` should look like:

```env
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://admin:password@mongodb:27017/tolling_db?authSource=admin
MONGODB_DATABASE=tolling_db
MONGODB_COLLECTION=transactions

# AWS Bedrock Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
BEDROCK_MODEL=meta.llama3-8b-instruct-v1:0

# API Configuration
API_HOST=0.0.0.0
API_PORT=5000
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
```

(These are example keys - get your real ones from AWS)

---

## Video Guide (If You Prefer)

Search YouTube: **"AWS IAM Create Access Key"**

or

**"AWS Bedrock Getting Started"**

---

## Test Connection

After updating `.env`:

```bash
cd c:\Users\rames\projects\TollingLLM

# Rebuild Docker
docker-compose down
docker-compose up --build

# Check logs
docker logs tolling-llm-backend
```

Look for:
```
🤖 AWS Bedrock Service initialized
📍 Region: us-east-1
📊 Model: meta.llama3-8b-instruct-v1:0
✅ Connection successful
```

---

## Troubleshooting

### ❌ Error: "Model not available in region"
→ Make sure you enabled the model in Bedrock → Model access

### ❌ Error: "AccessDenied"
→ Check that your IAM user has `AmazonBedrockFullAccess` policy

### ❌ Error: "Invalid credentials"
→ Copy exact key and secret from AWS console (no extra spaces)

### ❌ Error: "User creation failed"
→ Make sure you're logged in with a root AWS account

---

## Security Tips

✅ **DO:**
- Keep your Access Key and Secret safe
- Store in `.env` (which is ignored by git)
- Rotate keys every 90 days
- Use separate keys for dev/prod

❌ **DON'T:**
- Commit `.env` to GitHub
- Share keys in email/Slack
- Hardcode keys in source code
- Use root account keys (always create IAM user)

---

## Next Steps

1. ✅ Create IAM user
2. ✅ Create Access Key
3. ✅ Copy to `.env`
4. ✅ Enable Bedrock models
5. ✅ Run: `docker-compose up --build`
6. ✅ Test at: `http://localhost:3000/agent`

Done! Ask if you get stuck.
