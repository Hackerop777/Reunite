# Deploying Reunite to Vercel

This edition of Reunite is tuned for **Vercel serverless** hosting. The matching engine and all core features are identical to the original local-dev version — only the infrastructure changed (Postgres instead of SQLite, HTTP polling instead of Socket.io, client-side thumbnails instead of filesystem uploads).

## Prerequisites

- A **GitHub** account (the repo lives there).
- A **Vercel** account (https://vercel.com — free tier is enough).
- A free **Neon Postgres** database (https://neon.tech). Vercel Postgres / Supabase also work, but the steps below assume Neon.

---

## Step 1 — Push this folder to GitHub

Push the contents of `vercel-build/` to a fresh GitHub repo (public or private — both work on Vercel free tier).

```bash
cd vercel-build
git init
git add .
git commit -m "Reunite (Vercel edition)"
git branch -M main
git remote add origin https://github.com/<you>/reunite.git
git push -u origin main
```

> The `.gitignore` already excludes `node_modules/`, `.next/`, `db/*.db*`, `.env`, etc.

## Step 2 — Create the Neon Postgres database

1. Sign up at https://neon.tech (free).
2. Create a new project — call it `reunite`.
3. In the project's **Connection Details**, copy the **pooled** connection string. It looks like:
   ```
   postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/reunite?sslmode=require
   ```
   (Make sure it ends with `?sslmode=require`.)

## Step 3 — Import the repo on Vercel

1. On https://vercel.com, click **Add New → Project**.
2. Import the GitHub repo you pushed in Step 1.
3. Vercel auto-detects the framework as **Next.js**. Leave the preset as-is.

## Step 4 — Set the `DATABASE_URL` environment variable

In **Vercel Project Settings → Environment Variables**, add:

| Name          | Value                                                       | Environments              |
|---------------|-------------------------------------------------------------|---------------------------|
| `DATABASE_URL`| `postgresql://...?sslmode=require` (the Neon pooled string) | Production, Preview, Development |

Click **Save**. (If you've already deployed once, you'll need to redeploy for the new env var to take effect.)

## Step 5 — Build settings

- **Root Directory**: leave as the repo root (unless you pushed `vercel-build/` as a subfolder of a larger repo — in that case, point Root Directory at it).
- **Build Command**: already set to `prisma generate && next build` via `vercel.json`. Don't override it.
- **Output Directory**: leave default (`Next.js` handles it).

## Step 6 — Create the database tables

The tables need to be created **once**. Two options:

**a) Locally (recommended):**
```bash
cd vercel-build
cp .env.example .env
# Edit .env and paste your Neon DATABASE_URL
bun install   # or npm install
bun run db:push   # creates all tables on Neon
```

**b) Or one-liner without writing `.env`:**
```bash
DATABASE_URL="postgresql://...?sslmode=require" npx prisma db push --skip-generate
```

You only do this once — Neon keeps the schema after that. If you later change `prisma/schema.prisma`, run `bun run db:push` again.

## Step 7 — Open the deployed app

Hit **Deploy** on Vercel. Once the build finishes:

1. Open the deployed URL.
2. Create a profile (name, roll number, department, year).
3. Post a LOST ticket (e.g. black Samsung phone, library, today).
4. In another browser / incognito, create a second profile and post a FOUND ticket for the same item.
5. Watch the matching engine create a Match row + notify both sides.
6. Open the match, tap **Contact**, and chat (messages sync every ~3s).

---

## Notes & trade-offs

- **Chat uses 3-second HTTP polling** instead of real-time WebSockets. Vercel free tier doesn't support long-running socket servers, so chat messages persist via the API and the open chat view refetches every 3 seconds. Functionally equivalent for a campus lost & found — messages just take a beat to appear instead of being instant.
- **Images are resized to small thumbnails** client-side (≤ 480px longest side, JPEG q=0.7, ~30–60KB each) and stored inline in the database as data URLs. No external file storage (S3, Vercel Blob, etc.) is needed.
- **Auth is simulated** (roll-number based). The session id is sent as an `x-lf-uid` header on every request (stored in `localStorage`) plus a `lf_uid` cookie as a fallback. This keeps auth working inside the Vercel preview iframe where `SameSite=Lax` cookies aren't attached to subrequests.

## Troubleshooting

- **"Not authenticated" inside the Vercel preview iframe** — already handled by the `x-lf-uid` header auth path. If you still see it, make sure your browser allows `localStorage` for the preview domain (some privacy modes block third-party storage).
- **Prisma "relation does not exist"** — you forgot Step 6. Run `bun run db:push` against your Neon URL to create the tables.
- **Build fails with `PrismaClientInitializationError`** — Vercel didn't run `prisma generate`. The `postinstall` script should handle this automatically; if not, the `vercel.json` `buildCommand` also runs it explicitly.
- **First deploy is slow** — Vercel caches `node_modules`. The first build takes ~2 min; subsequent builds are ~30s.
