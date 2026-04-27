# Contributing to TollingLLM

## For Contributors: Instant Cloud Deployment (2 minutes)

You don't need to run anything locally. Just fork, configure, and it deploys to the cloud automatically.

### Step 1: Fork the Repository

```bash
# Go to https://github.com/YOUR_USERNAME/tolling-llm
# Click "Fork" button
```

### Step 2: Push Code to Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/tolling-llm.git
cd tolling-llm
git checkout -b your-feature-name
# Make changes...
git add .
git commit -m "Add your feature"
git push origin your-feature-name
```

### Step 3: Auto-Deploy to Railway.app (Already Set Up!)

When you push to `main` or `production`, GitHub Actions automatically:
1. Builds Docker containers
2. Tests health checks
3. Deploys to Railway.app
4. Gives you a live URL

**Your app is live at**: `https://tolling-llm-xxxxx.railway.app`

---

## 🔧 Making Changes (No Local Setup Required)

### Add a Feature

1. **Fork the repo** (already done above)
2. **Create a branch**
   ```bash
   git checkout -b feature/my-feature
   ```

3. **Make changes** (any editor)
   - Edit files directly
   - No dependencies to install locally

4. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add my awesome feature"
   git push origin feature/my-feature
   ```

5. **Open Pull Request**
   - Go to GitHub repo
   - Click "New Pull Request"
   - Describe your changes
   - Submit!

6. **See it Live**
   - Once merged to `main`, it auto-deploys
   - View at: `https://tolling-llm-production.railway.app`

---

## 📝 Code Style & Guidelines

### Backend (Node.js/TypeScript)
- Use TypeScript types for all functions
- Follow existing code patterns in `backend/src/`
- Add error handling to service calls
- Update API docs in comments

Example:
```typescript
async function myFeature(param: string): Promise<string> {
  try {
    // Implementation
    return result;
  } catch (error) {
    console.error('Feature error:', error);
    throw error;
  }
}
```

### Frontend (React/TypeScript)
- Use functional components with hooks
- Add TypeScript types for props
- Follow folder structure in `frontend/src/`
- Add error boundaries where needed

Example:
```typescript
interface MyComponentProps {
  title: string;
  onSubmit: (data: string) => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onSubmit }) => {
  return <div>{title}</div>;
};
```

### Database (MongoDB)
- Use indexes for frequently queried fields
- Validate data at application layer
- Add comments for complex queries

---

## 🔑 Environment Variables (Production)

These are set automatically on Railway.app. To modify:

1. Go to Railway dashboard
2. Select `tolling-llm` project
3. Click "Variables" tab
4. Edit and save
5. Auto-redeploys with new values

**Important variables:**
```
NODE_ENV=production
MONGODB_URI=mongodb://admin:password@mongodb:27017/tolling_db
OLLAMA_HOST=http://ollama:11434
OLLAMA_MODEL=mistral
FRONTEND_URL=https://your-domain.com
```

---

## 🧪 Testing Your Changes

### Option A: View Live Deployment
- Every PR gets a preview URL
- Go to PR → "Deployments" tab
- Click the preview link

### Option B: Check Logs
```bash
# In Railway dashboard:
# Project → tolling-llm → Logs
# View real-time errors
```

### Option C: Manual Testing
1. Go to live app: https://tolling-llm-xxxxx.railway.app
2. Test your feature
3. Check browser console for errors

---

## 🐛 Debugging

### View Live Logs
```bash
# Railway dashboard
Project → Services → tolling-llm → Logs
```

### Check API Status
```bash
curl https://tolling-llm-xxxxx.railway.app/api/health
# Should return: {"status":"ok"}
```

### Database Issues
```bash
# Contact maintainer for MongoDB Atlas access
# Or review logs in Railway dashboard
```

---

## 📋 Pull Request Process

1. **Fork** the repository
2. **Create branch**: `git checkout -b feature/your-feature`
3. **Make changes** and push
4. **Open PR** with description:
   - What changed?
   - Why?
   - How to test?

5. **Wait for review** (maintainers will check)
6. **Fix review feedback** if any
7. **Merge!** 🎉

Template:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update

## Testing
How to test this change?

## Screenshots (if UI change)
Add screenshots here
```

---

## 📂 Project Structure

```
TollingLLM/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── mongodbService.ts
│   │   │   ├── chatAgentService.ts
│   │   │   └── sagemakerService.ts
│   │   ├── routes/
│   │   │   ├── transactions.ts
│   │   │   └── health.ts
│   │   ├── socket/
│   │   │   └── socketHandlers.ts
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.tsx
│   │   │   └── DataTable.tsx
│   │   ├── pages/
│   │   │   ├── Agent.tsx
│   │   │   └── Browse.tsx
│   │   ├── styles/
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── docker-compose.yml (development)
├── docker-compose.prod.yml (production)
├── .github/
│   └── workflows/
│       └── deploy.yml (auto-deployment)
└── README.md
```

---

## 🔄 Common Tasks

### Add New API Endpoint

1. Create route in `backend/src/routes/`
2. Add handler in `backend/src/services/`
3. Update API docs comments
4. Push to GitHub → auto-deploys

### Add UI Component

1. Create component in `frontend/src/components/`
2. Use in `frontend/src/pages/`
3. Add styles in matching `.css` file
4. Push to GitHub → auto-deploys

### Update Database Schema

1. Modify MongoDB query in service
2. Add validation
3. Update types
4. Push → auto-deploys

### Change Environment Variables

1. Go to Railway dashboard
2. Project → Variables
3. Update values
4. Save → auto-redeploys

---

## 🚫 What NOT to Do

- ❌ Don't hardcode credentials in code
- ❌ Don't commit `.env` file
- ❌ Don't run `npm install` in production
- ❌ Don't modify docker-compose.yml
- ❌ Don't change MongoDB credentials
- ❌ Don't add heavy dependencies without discussion

---

## ✅ Checklist Before Submitting PR

- [ ] Code follows style guidelines
- [ ] No console.log statements left
- [ ] Error handling is in place
- [ ] Types are defined (TypeScript)
- [ ] No breaking changes
- [ ] Tested in preview deployment
- [ ] PR description is clear

---

## 💡 Tips for Contributors

1. **Start small**: Fix a typo, add a feature
2. **Ask before big changes**: Open an issue first
3. **Read existing code**: Follow patterns
4. **Test your changes**: Use preview deployment
5. **Be respectful**: Follow code of conduct

---

## 🎓 Need Help?

- **Read errors**: Check Railway logs
- **Ask questions**: GitHub Discussions
- **Report bugs**: GitHub Issues
- **Email**: maintainer@example.com

---

## 🎉 You're Ready!

1. Fork the repo
2. Make changes
3. Push to GitHub
4. Wait for auto-deployment
5. Share the live URL!

**That's all! No local setup needed.** 🚀

---

Last Updated: April 2026
