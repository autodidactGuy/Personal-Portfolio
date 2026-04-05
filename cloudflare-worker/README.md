# Cloudflare Worker for Decap CMS Auth

This Worker provides GitHub OAuth for the static Decap CMS admin and only allows the GitHub user `autodidactGuy`.

## Files

- `src/index.js`: Worker implementation
- `wrangler.jsonc`: Worker config
- `.dev.vars.example`: local development secret template

## GitHub OAuth app

Create a GitHub OAuth app with:

- Homepage URL: `https://hassanraza.us`
- Authorization callback URL: `https://personal-portfolio.hassanraza632.workers.dev/callback`

## Cloudflare secrets

Set these secrets before deploy:

```bash
cd cloudflare-worker
npm install
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

## Deploy

```bash
cd cloudflare-worker
npm install
npx wrangler deploy
```

## Expected Worker URL

This repo's Decap config currently points to:

`https://personal-portfolio.hassanraza632.workers.dev/`

If your deployed Worker URL changes, update [config.yml](/Users/hassanraza/Projects/Personal-Portfolio/public/admin/config.yml) and your GitHub OAuth callback URL together.

## Expected local and production admin URLs

- Production: `https://hassanraza.us/admin/`
- Local: `http://localhost:3000/admin/`

## How authorization is restricted

The Worker fetches the authenticated GitHub profile and only completes login when:

- `profile.login === "autodidactGuy"`

Anyone else receives `403 Access denied`.

## Local development

1. Copy `.dev.vars.example` to `.dev.vars`
2. Fill in your GitHub OAuth credentials
3. Add local origins:

```env
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ORIGIN=http://localhost:3000
REPO_BASE_PATH=
```

4. Run:

```bash
cd cloudflare-worker
npm install
npx wrangler dev
```
