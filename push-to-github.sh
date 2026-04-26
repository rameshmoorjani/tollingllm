#!/bin/bash
# Push TollingLLM to GitHub
# Run these commands after creating the GitHub repository

cd c:\Users\rames\projects\TollingLLM

# Verify remote is set
git remote -v

# Push all branches
git push -u origin --all

# Push all tags
git push -u origin --tags

# Verify on GitHub
echo "✅ Done! Visit: https://github.com/rameshmoorjani/TollingLLM"
