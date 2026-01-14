---
description: Deploy latest pushed changes to Vercel and Fly.io
allowed-tools: Bash(npx vercel:*), Bash(fly deploy:*), Bash(git:*), Bash(cd:*)
argument-hint: [frontend|backend|all]
---

# Deploy to Production

Deploy the latest pushed changes to production environments.

## Context
- Current branch: !`cd task-helper && git branch --show-current`
- Last commit: !`cd task-helper && git log -1 --oneline`
- Uncommitted changes: !`cd task-helper && git status --short`

## Instructions

1. First, verify there are no uncommitted changes. If there are, warn the user and ask if they want to continue or run `/ship` first.

2. Check $ARGUMENTS to determine what to deploy:
   - `frontend` - deploy only frontend to Vercel
   - `backend` - deploy only backend to Fly.io
   - `all` or empty - deploy both

3. **Frontend deployment (Vercel):**
   ```bash
   cd task-helper/frontend && npx vercel --prod
   ```

4. **Backend deployment (Fly.io):**
   ```bash
   cd task-helper/backend && fly deploy
   ```

5. After deployment, report:
   - Deployment status (success/failure)
   - URLs of deployed services
   - Any warnings or errors encountered

## Production URLs
- Frontend: https://task-helper-frontend.vercel.app
- Backend: https://task-helper-backend.fly.dev
