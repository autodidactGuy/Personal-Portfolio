# Personal Portfolio Agent Guide

Use this repo guide for any change in the portfolio site or the Cloudflare Worker.

## Start Here

Read these files before making structural, content-model, design-system, build, SEO, or assistant changes:

- [docs/repo-maintenance.md](/Users/hassanraza/Projects/Personal-Portfolio/docs/repo-maintenance.md)
- [docs/repo-architecture-graph.md](/Users/hassanraza/Projects/Personal-Portfolio/docs/repo-architecture-graph.md)
- [\.ai/skills/personal-portfolio-maintainer/SKILL.md](/Users/hassanraza/Projects/Personal-Portfolio/.ai/skills/personal-portfolio-maintainer/SKILL.md)

## Non-Negotiable Rules

- Preserve the static-first architecture. The main app is a static export from Next.js and should not gain runtime-only server dependencies.
- Treat `src/styles/globals.css` as the single source of truth for portfolio color tokens and theme variables.
- Treat `src/config/fonts.ts` as the single source of truth for app typography stacks.
- Treat `content/settings/site.json` as the single source of truth for public site identity, nav, social links, and canonical site metadata.
- Treat `src/types/content.ts` as the schema contract for JSON content and MDX frontmatter. Update schemas whenever content shape changes.
- Treat `src/lib/content.ts` as the canonical content loading and grouping layer.
- Treat `src/lib/seo.ts`, `src/layouts/head.tsx`, and `scripts/generate-seo-assets.mjs` as the SEO system. Keep metadata, structured data, sitemap, robots, and OG generation aligned.
- Treat `public/api/resume.json`, `public/search-index.json`, `public/sitemap.xml`, `public/robots.txt`, and generated `public/og/*` assets as derived artifacts. Regenerate them when their inputs change.
- Keep the Cloudflare Worker aligned with the site assistant and contact form contracts. Frontend contract changes usually require worker review too.
- Update [docs/repo-architecture-graph.md](/Users/hassanraza/Projects/Personal-Portfolio/docs/repo-architecture-graph.md) whenever architecture, ownership, data flow, or generation paths change.

## Validation

For relevant changes, run the smallest honest set of checks:

- `yarn lint`
- `yarn typecheck`
- `yarn build`
- `cd cloudflare-worker && yarn test`
- `cd cloudflare-worker && yarn typecheck`

If you change generated artifact inputs, rerun the matching generator:

- `yarn resume:generate`
- `yarn search:generate`
- `yarn seo:assets`
- `yarn seo:og`
- `yarn icons:generate`

## Dependency Rules

- Prefer the libraries already standardized in this repo: Next.js 15, React 19, Tailwind CSS 4, HeroUI, Zod 4, React Hook Form, Biome, and Wrangler.
- Do not add overlapping libraries unless the current stack clearly cannot cover the need.
- If adding or upgrading dependencies, prefer current stable releases compatible with the existing stack and update docs if the architectural guidance changes.

## Documentation Update Rule

Update the maintenance docs in the same change whenever you modify:

- design tokens, typography, or theming
- content models or content locations
- routes, page ownership, or rendering mode
- generated artifacts or build scripts
- SEO behavior or structured data
- worker endpoints, providers, retrieval, or deployment flow
- CI, deployment, or required environment variables

## Cursor Cloud specific instructions

Repo-level cloud agent configuration lives in `.cursor/environment.json`. Cursor resolves this file before personal or team saved environments.

After saving a Cloud Agents environment snapshot from the dashboard, paste its ID into the `snapshot` field in `.cursor/environment.json` so future agents boot from the cached VM image. Snapshot IDs are available at [Cloud Agents → Environments](https://cursor.com/dashboard?tab=cloud-agents) after you save the environment.

### Services

| Service | Command | URL | Notes |
|---|---|---|---|
| Next.js dev server (required for site work) | `yarn dev` | `http://localhost:3000` | Regenerates `resume.json` and `search-index.json` before starting |
| Static export preview (optional) | `yarn build && yarn start` | `http://localhost:3000` | Serves the `out/` directory |
| Cloudflare Worker (optional) | `cd cloudflare-worker && yarn dev` | `http://127.0.0.1:8787` | Needed for contact form, AI assistant, and CMS OAuth E2E |

No `.env` file is required for basic site development. Public defaults live in `config/public-env.defaults.json`. When the site runs on `localhost`, it auto-targets the local worker via `NEXT_PUBLIC_LOCAL_WORKER_URL` (`http://127.0.0.1:8787`).

### Install and validation

Install both workspaces after pulling changes:

```bash
yarn install --frozen-lockfile
cd cloudflare-worker && yarn install --frozen-lockfile
```

Standard checks (see Validation section above): `yarn lint`, `yarn typecheck`, `yarn build`, `cd cloudflare-worker && yarn test`, `cd cloudflare-worker && yarn typecheck`.

### Gotchas

- `yarn dev` runs content generators (`resume:generate`, `search:generate`) before Next.js starts; expect a short delay on first launch.
- `yarn build` may print an ESLint-not-installed warning during the Next.js build step; the build still succeeds because linting is handled by Biome via `yarn lint`.
- Worker E2E features (contact email, AI assistant, Decap CMS OAuth) require `cloudflare-worker/.dev.vars` secrets or `yarn dev:remote` with Cloudflare credentials. These are not needed for static site pages, search, or content editing in the repo.
- Node 20+ works for the root app; the worker CI uses Node 22. Both install cleanly on Node 22.
