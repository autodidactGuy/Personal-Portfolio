# Cloudflare Worker for Decap CMS Auth

This Worker provides GitHub OAuth for the static Decap CMS admin and only allows the GitHub user `autodidactGuy`.

## Files

- `src/index.js`: Worker implementation
- `wrangler.jsonc`: Worker config
- `.dev.vars.example`: local development secret template
- `wrangler.rag.example.toml`: parallel RAG worker example config
- `src/index.ts`: future TypeScript RAG worker entry
- `src/rag/*`: isolated RAG runtime helpers
- `scripts/ingest.ts`: dataset ingestion script for Vectorize + KV
- `scripts/build-rag-dataset.ts`: builds a single RAG dataset from the existing portfolio content

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

## Parallel RAG Artifacts

This repo now includes a parallel, non-cutover RAG implementation path for a portfolio dataset. It is intentionally isolated from the current deployed `src/index.js` worker so existing auth/contact/assistant behavior remains unchanged until you explicitly switch over.

### Exact file structure

- `wrangler.rag.example.toml`
- `src/index.ts`
- `src/rag/config.ts`
- `src/rag/prompt.ts`
- `src/rag/retrieve.ts`
- `src/rag/response.ts`
- `src/rag/types.ts`
- `scripts/ingest.ts`
- `scripts/lib/dataset.ts`
- `scripts/lib/chunking.ts`
- `scripts/lib/ids.ts`
- `scripts/lib/cloudflare-api.ts`

### Setup steps

1. Create a Vectorize index with 384 dimensions and cosine distance:

```bash
cd cloudflare-worker
yarn rag:index:create
```

2. Create a KV namespace for chunk payloads:

```bash
cd cloudflare-worker
npx wrangler kv namespace create RAG_KV
npx wrangler kv namespace create RAG_KV --preview
```

3. Copy the returned namespace IDs into `wrangler.rag.example.toml`.
4. Generate worker env types once bindings are finalized:

```bash
cd cloudflare-worker
yarn rag:types
```

5. Provide Cloudflare credentials plus a dataset file path, then run ingestion:

```bash
cd cloudflare-worker
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_VECTORIZE_INDEX=portfolio-rag-index
export CLOUDFLARE_KV_NAMESPACE_ID=...
yarn rag:ingest ./data/portfolio-rag.json
```

6. Test the future worker entry locally against remote bindings:

```bash
cd cloudflare-worker
yarn rag:dev:remote
```

### Automated build and deploy flow

The RAG flow can now build its own dataset from the existing portfolio content, ingest it into Vectorize + KV, and then deploy the worker.

```bash
cd cloudflare-worker
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_VECTORIZE_INDEX=portfolio-rag-index
export CLOUDFLARE_KV_NAMESPACE_ID=...
yarn rag:build
```

That command does three things:

1. runs the root `resume:generate` step so the latest portfolio data is available
2. builds `.generated/portfolio-rag.json` from the current portfolio content
3. embeds and upserts the chunks into Vectorize and stores chunk payloads in KV

To ingest and deploy in one command:

```bash
cd cloudflare-worker
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_VECTORIZE_INDEX=portfolio-rag-index
export CLOUDFLARE_KV_NAMESPACE_ID=...
yarn rag:deploy
```

If you use Cloudflare Workers Builds, set the deploy command to `yarn rag:deploy` so ingestion happens automatically before the worker deploy step.

### GitHub setup for the RAG workflow

Add these repository secrets in GitHub:

1. Open the repository on GitHub.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Add these secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_VECTORIZE_INDEX`
- `CLOUDFLARE_KV_NAMESPACE_ID`
- `CLOUDFLARE_KV_PREVIEW_NAMESPACE_ID`

Notes:

- `CLOUDFLARE_VECTORIZE_INDEX` should usually be `portfolio-rag-index`.
- `CLOUDFLARE_KV_PREVIEW_NAMESPACE_ID` can be the same as `CLOUDFLARE_KV_NAMESPACE_ID` if you do not want a separate preview KV namespace in CI.
- The dedicated workflow file is [deploy-rag-worker.yml](/Users/hassanraza/Projects/Personal-Portfolio/.github/workflows/deploy-rag-worker.yml).
- That workflow installs the root app and worker dependencies, rebuilds the resume dataset, ingests vectors and KV content, and then deploys the RAG worker on pushes to `main`.

### How ingestion works

The ingestion pipeline is:

1. `scripts/build-rag-dataset.ts`
   Reads the current portfolio content from this repo and emits one normalized JSON dataset at `cloudflare-worker/.generated/portfolio-rag.json`.
2. `scripts/ingest.ts`
   Loads that dataset, creates summary and body chunks, generates deterministic IDs, batches embeddings through Workers AI, upserts vectors into Vectorize, and stores full chunk payloads in KV by vector ID.
3. `src/rag-app.ts`
   At runtime, `/ask` embeds the question, queries Vectorize, bulk-fetches matching chunk payloads from KV, and only calls the LLM when retrieval is strong enough.

The worker also serves a tiny built-in test page on `/` so you can quickly try the same `/ask` endpoint without wiring a separate frontend first.

### Dataset expectations

The ingestion script expects one JSON file and supports flexible top-level aliases:

- `personal`, `basic`, or `profile`
- `experience`
- `education`
- `entries`, `posts`, or `portfolio`

Each content entry should include a `title` and may include `summary`, `excerpt`, `body`, `content`, `sections`, `tags`, `slug`, `url`, and `priority`.

The automated dataset builder already produces this shape from:

- `public/api/resume.json`
- `content/posts/*.mdx`

The builder now includes the full `resume.json` surface area, including:

- hero content
- about content
- featured focus
- home stats
- interests
- skills
- links
- contact details
- recommendations
- experience
- education
- projects
- articles
- case studies

When a matching post exists in `content/posts/*.mdx`, the builder prefers the full MDX body so the vector dataset has richer retrieval content than the short summary alone.

### Free-tier optimizations and tradeoffs

- Uses `@cf/baai/bge-small-en-v1.5` embeddings at 384 dimensions to keep Vectorize storage and query cost low.
- Uses KV for chunk payload lookup instead of D1 because the dataset is mostly static and lookup-after-search is simple.
- Keeps retrieval small with `topK=6` and `maxContextChunks=4`.
- Skips the LLM call entirely when retrieval is empty or below threshold.
- Uses batch embeddings, Vectorize upserts, and KV bulk writes during ingestion to reduce request overhead.
- Stores only small indexed metadata in Vectorize and full chunk payloads in KV.
