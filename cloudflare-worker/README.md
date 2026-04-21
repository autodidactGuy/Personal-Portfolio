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

If your deployed Worker URL changes, update [config.yml](/Users/hassanraza/Projects/Personal-Portfolio/public/cms-admin/config.yml) and your GitHub OAuth callback URL together.

## Expected local and production admin URLs

- Production: `https://hassanraza.us/cms-admin/`
- Local: `http://localhost:3000/cms-admin/`

## How authorization is restricted

The Worker fetches the authenticated GitHub profile and only completes login when:

- `profile.login === "autodidactGuy"`

Anyone else receives `403 Access denied`.

## Local development

For fast offline/local-only testing you can still use `.dev.vars`, but for full assistant testing it is better to run the worker locally against remote Cloudflare bindings and secrets.

### Local worker with remote Cloudflare credentials

When Wrangler serves the worker on a local URL like `http://127.0.0.1:8787`, the worker automatically accepts localhost origins from the local site while still using the default remote Worker secrets and bindings.

Run it with:

```bash
cd cloudflare-worker
yarn install
yarn dev:remote
```

This starts `wrangler dev --remote`, so requests from your local Next app can hit the worker while still using your configured remote Cloudflare secrets.

### Pure local worker mode

If you want a fully local worker instead:

1. Copy `.dev.vars.example` to `.dev.vars`
2. Fill in your secrets
3. Run:

```bash
cd cloudflare-worker
yarn install
yarn dev
```
