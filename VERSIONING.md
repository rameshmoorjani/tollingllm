# TollingLLM - Version Strategy

This document outlines the different versions/branches of TollingLLM and their purposes.

---

## Branch Structure

```
master (v1.0 - STABLE/CURRENT)
├── v2-query-router (Layer 1: Smart Query Classification)
├── v3-data-preprocessing (Layer 2: Data Reduction + RAG)
└── v4-groq-integration (Layer 3: Groq API Integration)
```

---

## Version Details

### **master (v1.0) - Current Working Version**
- **Status**: ✅ STABLE - Working but slow
- **LLM Model**: Ollama + Phi (2.7B)
- **Speed**: 4 minutes per response
- **Token Limit**: 2,048 tokens
- **Performance**: Works for <1,000 transactions per customer
- **Cost**: Free (local)

**Features**:
- ✅ Basic chat interface
- ✅ Customer dropdown selector
- ✅ Cross-customer analytics
- ✅ MongoDB integration
- ✅ WebSocket real-time messaging
- ❌ No query optimization
- ❌ No smart data reduction

**When to use**: Development, testing, understanding the baseline

**Try it**:
```bash
git checkout master
docker-compose up -d
# Visit http://localhost:3000/agent
```

---

### **v2-query-router - Layer 1: Smart Query Classification**
- **Status**: 🔄 PLANNED
- **Purpose**: Route simple math queries to database, complex queries to LLM
- **Expected Speed**: 10ms (simple) + 4min (complex)
- **New Files**:
  - `backend/src/services/queryRouterService.ts`

**What gets added**:
- Query classifier (regex-based intent detection)
- Database shortcut for SUM, COUNT, AVG, MAX queries
- Confidence scoring system
- Dynamic routing logic

**Example routing**:
```
"What's my total?" → DATABASE (10ms) ✅
"Spot anomalies" → LLM (4min) ✅
```

**How to switch**:
```bash
git checkout v2-query-router
# Implement query router logic
# Test and commit
```

---

### **v3-data-preprocessing - Layer 2: Smart Data Reduction (RAG)**
- **Status**: 🔄 PLANNED
- **Purpose**: Reduce tokens from 26,000 → 1,500 using aggregation
- **Expected Speed**: 4 minutes (same) but with full context
- **New Methods**:
  - Weekly/monthly aggregation
  - Outlier detection
  - Summary statistics
  - Feature extraction

**What gets added**:
- `backend/src/services/dataPreprocessingService.ts`
- Methods in `mongodbService.ts` for aggregations
- Context building logic

**Example data reduction**:
```
Input:  1,000 transactions (26,000 tokens)
Output: Weekly summaries + stats + outliers (1,500 tokens) ✅
```

**How to switch**:
```bash
git checkout v3-data-preprocessing
# Implement preprocessing layer
# Test with Phi (should work better now)
# Commit changes
```

---

### **v4-groq-integration - Layer 3: Fast LLM (Best)**
- **Status**: 🔄 PLANNED
- **Purpose**: Replace Ollama with Groq for <1 second responses
- **LLM Model**: Groq API + Mixtral (8x7B)
- **Speed**: <1 second per response
- **Token Limit**: 32,000 tokens
- **Cost**: Free tier (30 req/min) or $0.35/million tokens

**What gets changed**:
- Replace `sagemakerService.ts` with `groqService.ts`
- Update environment variables (add GROQ_API_KEY)
- Update docker-compose.yml (remove Ollama, add Groq)

**Example speed improvement**:
```
Before (Phi): 4 minutes
After (Groq): <1 second
Improvement: 240x faster! 🚀
```

**How to switch**:
```bash
git checkout v4-groq-integration
# Get free API key: https://console.groq.com
# Implement Groq integration
# Test locally
# Commit
```

---

## Implementation Timeline

```
Week 1: v2-query-router (implement smart routing)
Week 2: v3-data-preprocessing (add data reduction)
Week 3: v4-groq-integration (switch to Groq)
Week 4: Merge best version back to master
```

---

## Switching Between Versions

```bash
# View all branches
git branch -a

# Switch to specific version
git checkout master              # Current stable
git checkout v2-query-router     # Try smart routing
git checkout v3-data-preprocessing  # Try data reduction
git checkout v4-groq-integration    # Try Groq

# Before switching, save your work
git stash
git checkout <branch-name>
git stash pop  # If needed

# Compare versions
git diff master v2-query-router
git diff v2-query-router v3-data-preprocessing
```

---

## Pull Changes Between Branches

To merge features from one branch to another:

```bash
# Merge v2 features into v3
git checkout v3-data-preprocessing
git merge v2-query-router

# Or merge master into v2 for latest updates
git checkout v2-query-router
git merge master
```

---

## Pushing to GitHub

1. **Create new repo** on GitHub (https://github.com/new)
   - Name: `TollingLLM`
   - Description: "AI-powered tolling transaction analyzer"
   - Public/Private: Your choice

2. **Add remote and push**:
```bash
cd c:\Users\rames\projects\TollingLLM

# Add remote (replace YOUR_REPO with actual)
git remote add origin https://github.com/rameshmoorjani/TollingLLM.git

# Push all branches
git push -u origin master
git push -u origin v2-query-router
git push -u origin v3-data-preprocessing
git push -u origin v4-groq-integration

# Or push everything at once
git push -u origin --all
```

3. **Verify on GitHub**:
   - Check https://github.com/rameshmoorjani/TollingLLM/branches

---

## Testing Each Version

### v1.0 (Current)
```bash
git checkout master
docker-compose up -d
# Open http://localhost:3000/agent
# Select CUST004
# Ask: "What is my total toll amount?"
# Expected: Takes 4 minutes, responds correctly
```

### v2 (Query Router)
```bash
git checkout v2-query-router
docker-compose up -d
# Same query: "What is my total toll amount?"
# Expected: Returns instantly (<50ms) via database
```

### v3 (Data Preprocessing)
```bash
git checkout v3-data-preprocessing
docker-compose up -d
# Ask: "Spot spending anomalies"
# Expected: Sends only 50 transactions + summaries, faster analysis
```

### v4 (Groq)
```bash
git checkout v4-groq-integration
# Add GROQ_API_KEY to backend/.env
docker-compose up -d
# Any query
# Expected: <1 second response
```

---

## Commit History

View all versions and their commits:

```bash
git log --oneline --all --graph

# Output will show something like:
# * bca2242 (HEAD -> master) v1.0: Working Ollama + Phi
#   v2-query-router
#   v3-data-preprocessing
#   v4-groq-integration
```

---

## Key Metrics by Version

| Version | Speed | Model | Tokens | Cost | Scalability |
|---------|-------|-------|--------|------|-------------|
| **v1.0** | 4 min | Phi | 2,048 | Free | ~1K trans |
| **v2** | 10ms-4min | Phi | 2,048 | Free | ~1K trans |
| **v3** | 2 min | Phi | 1,500 | Free | ~10K trans |
| **v4** | <1 sec | Mixtral | 32K | Free/$ | ~1M trans |

---

## Next Steps

1. ✅ Current version saved to `master` branch
2. ⏳ Switch to `v2-query-router` to implement query routing
3. ⏳ Test v2, then merge into v3 with preprocessing
4. ⏳ Get Groq API key and implement v4
5. ⏳ Compare all versions and pick best for production
6. ⏳ Push to GitHub and share

---

**Questions?** Check the git log or branch diff:
```bash
git diff master v2-query-router  # See what's different
git show master:backend/src/services/chatAgentService.ts  # View specific file at version
```
