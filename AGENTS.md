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
