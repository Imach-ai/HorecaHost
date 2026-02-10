Deployment guide — Frontend on Vercel, Backend on Render/Fly/Similar
===============================================================

Overview
--------
- Frontend (React + Vite): deploy to Vercel (optimal).
- Backend (Node/Express + Postgres): deploy to a server hosting full Node processes (Render, Fly, Railway, or a container provider). Vercel Serverless Functions are possible but require refactor.
- Database: Neon (Postgres). Use the provided DATABASE_URL in the hosting platform's environment variables — never commit it.

Checklist (safe, non-breaking changes to do now)
------------------------------------------------
1. Remove any secrets from the repository (do not commit them). Use `.env.example` for examples.
2. Ensure `.gitignore` contains `.env` and backend/.env (done).
3. Update `backend/database.js` to read `process.env.DATABASE_URL` (done). Do NOT hardcode credentials.
4. Set environment variables in hosting panels:
   - DATABASE_URL (full Neon connection string)
   - JWT_SECRET (strong random string)
   - NODE_ENV=production
   - PORT (optional, host usually provides)
5. Configure CORS to allow your frontend origin in production.
6. Turn on TLS/HTTPS (platforms provide it).
7. Monitor logs, enable restarts and health checks.

Frontend (Vercel) steps
-----------------------
1. Push repo to Git provider (GitHub/GitLab).
2. In Vercel, import the repo and set the root to `/frontend` (or use monorepo settings).
3. Set build command: `npm install && npm run build` (Vercel usually detects Vite).
4. Set output directory: `frontend/dist`
5. Add environment variables only if used by frontend (e.g., API_BASE_URL).
6. Deploy and check the site.

Backend steps (recommended: Render or Fly)
-----------------------------------------
1. Create a new service (Web Service) that runs `node backend/server.js` (or the start script).
2. Set the environment variables (DATABASE_URL, JWT_SECRET, NODE_ENV=production).
3. Expose the service publicly, enable health checks (`/api/health`).
4. Configure automatic deploys from your repository branch.

Security & Best Practices
-------------------------
- Never commit secrets. If a secret was accidentally committed, rotate it immediately.
- Use JWT_SECRET with at least 32 bytes (random) in production.
- Use HTTPS and keep DATABASE_URL secret.
- Limit CORS to the frontend origin in production.
- Add rate-limiting and helmet middleware (optional improvements).
- Configure proper logging and monitoring (Sentry/LogDNA).

Optional improvements to implement later (non-breaking)
-----------------------------------------------------
- Add helmet and express-rate-limit
- Enforce strong Content-Security-Policy (CSP) on frontend
- Add GitHub Actions for CI (run lint/tests)
- Add a migration system (node-pg-migrate or Prisma migrations)
- Move large static assets to an object storage (S3/Backblaze) and serve via CDN

If you want, I can:
- Prepare Vercel config file for the frontend
- Add a small server hardening patch (helmet + rate-limit) to backend
- Create GitHub Action for CI

Tell me which of the above you'd like me to apply and I will implement the safe changes.
