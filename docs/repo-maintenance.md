# Repo Maintenance Handbook

This file is the human and agent source of truth for how this repository is intended to evolve.

## Product Shape

This repo contains two connected products:

- A static-first Next.js portfolio site exported from the root app.
- A Cloudflare Worker that handles contact delivery, Decap auth, assistant routing, and semantic retrieval.

The portfolio is content-driven. Published content lives under `content/`, page rendering lives under `src/`, and several public artifacts are generated into `public/` before or during build.

## Architecture Snapshot

### Root app

- Framework: Next.js 15 pages router with `output: "export"` in [next.config.mjs](/Users/hassanraza/Projects/Personal-Portfolio/next.config.mjs)
- UI: React 19, HeroUI, Tailwind CSS 4, `animate.css`
- Styling entrypoint: [src/styles/globals.css](/Users/hassanraza/Projects/Personal-Portfolio/src/styles/globals.css)
- Typography entrypoint: [src/config/fonts.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/config/fonts.ts)
- Content loading: [src/lib/content.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/lib/content.ts)
- Content schemas: [src/types/content.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/types/content.ts)
- SEO layer: [src/lib/seo.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/lib/seo.ts) and [src/layouts/head.tsx](/Users/hassanraza/Projects/Personal-Portfolio/src/layouts/head.tsx)

### Worker app

- Runtime: Cloudflare Worker in [cloudflare-worker/src/index.ts](/Users/hassanraza/Projects/Personal-Portfolio/cloudflare-worker/src/index.ts)
- Retrieval stack: `src/rag/*` plus Vectorize, R2, and Workers AI
- Contact handling: worker `/contact` endpoint
- CMS auth: worker `/auth` and `/callback`

## Single Sources Of Truth

### Brand, theme, and UI system

- Colors and theme tokens: [src/styles/globals.css](/Users/hassanraza/Projects/Personal-Portfolio/src/styles/globals.css)
- Tailwind custom screens and animations: [tailwind.config.ts](/Users/hassanraza/Projects/Personal-Portfolio/tailwind.config.ts)
- Font stacks: [src/config/fonts.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/config/fonts.ts)
- Public site identity, nav, and social links: [content/settings/site.json](/Users/hassanraza/Projects/Personal-Portfolio/content/settings/site.json)

Rules:

- Add new reusable colors as CSS variables first; do not scatter raw hex values through components.
- Keep light and dark token sets mirrored when introducing a new theme token.
- Reuse font stacks from `src/config/fonts.ts`; do not invent component-local font stacks.
- When a style becomes reusable across pages, move it toward tokens, shared utility classes, or shared components.

### Content system

- JSON and MDX schema contract: [src/types/content.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/types/content.ts)
- Disk loading, filtering, and grouping: [src/lib/content.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/lib/content.ts)
- Site-wide config projection: [src/config/site.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/config/site.ts)

Rules:

- Every content shape change must update schemas first.
- Any new content collection should get schema coverage before page usage.
- Keep grouping rules explicit. Projects currently include `project` and `case-study`; blog includes the rest.
- Keep generated consumers aligned when content fields change.

### SEO

- Canonical and social metadata rules: [src/lib/seo.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/lib/seo.ts)
- Tag rendering and structured data output: [src/layouts/head.tsx](/Users/hassanraza/Projects/Personal-Portfolio/src/layouts/head.tsx)
- SEO asset generation: [scripts/generate-seo-assets.mjs](/Users/hassanraza/Projects/Personal-Portfolio/scripts/generate-seo-assets.mjs)
- OG image generation: [scripts/generate-og-images.mjs](/Users/hassanraza/Projects/Personal-Portfolio/scripts/generate-og-images.mjs)

Rules:

- Every public page should have explicit metadata intent.
- Prefer canonical URLs with trailing slashes for pages unless the target is a file.
- Keep schema.org data aligned with page purpose.
- When adding pages or changing slugs, review sitemap, robots, canonical URLs, and OG asset coverage together.

### Build, lint, and types

- Root scripts: [package.json](/Users/hassanraza/Projects/Personal-Portfolio/package.json)
- Worker scripts: [cloudflare-worker/package.json](/Users/hassanraza/Projects/Personal-Portfolio/cloudflare-worker/package.json)
- Lint config: [biome.json](/Users/hassanraza/Projects/Personal-Portfolio/biome.json)
- TypeScript config: [tsconfig.json](/Users/hassanraza/Projects/Personal-Portfolio/tsconfig.json)
- Site deploy workflow: [\.github/workflows/deploy.yml](/Users/hassanraza/Projects/Personal-Portfolio/.github/workflows/deploy.yml)
- Worker deploy workflow: [\.github/workflows/deploy-worker.yml](/Users/hassanraza/Projects/Personal-Portfolio/.github/workflows/deploy-worker.yml)

Rules:

- `yarn build` is the main site integrity check because it runs lint, SEO asset generation, resume generation, search generation, and the static build.
- Worker behavior changes should keep `yarn test` and `yarn typecheck` healthy inside `cloudflare-worker/`.
- Keep CI commands consistent with local scripts instead of inventing workflow-only logic where possible.

## Generated Artifact Map

These files are outputs, not manual sources of truth:

- `public/api/resume.json`
  Generated by `yarn resume:generate`
- `public/search-index.json`
  Generated by `yarn search:generate`
- `public/sitemap.xml`
  Generated by `yarn seo:assets`
- `public/robots.txt`
  Generated by `yarn seo:assets`
- `public/og/*`
  Generated by `yarn seo:og`
- `src/generated/content-icons.json`
  Generated by `yarn icons:generate`
- `public/cms-admin/content-icons.json`
  Generated by `yarn icons:generate`

Whenever input content, SEO logic, or assistant knowledge shape changes, regenerate the affected artifacts in the same change.

## Library Guidance

Preferred stack for new work:

- Next.js pages router unless there is a deliberate migration plan
- React 19 patterns compatible with the current app
- HeroUI primitives before adding a second component system
- Tailwind CSS 4 and shared CSS variables for styling
- Zod 4 for validation and schema contracts
- React Hook Form plus Zod resolvers for forms
- Biome for linting/formatting concerns

Avoid:

- Introducing a second state/form/style system without a strong reason
- Adding runtime server dependencies to the root app
- Bypassing schemas for content or external payloads

## SEO Checklist

For new or changed public pages:

- Set title, description, pathname, and image intent.
- Confirm canonical URL behavior.
- Add or adjust structured data if the page semantics changed.
- Ensure social image coverage still exists.
- If the page is indexable, make sure sitemap generation still includes it.
- If the page should not index, set `noindex` intentionally and keep it out of SEO-generated assumptions.

## Environment And Integrations

### Root public env

Key build-time values are resolved in [next.config.mjs](/Users/hassanraza/Projects/Personal-Portfolio/next.config.mjs):

- `NEXT_PUBLIC_BASE_PATH`
- `NEXT_PUBLIC_REPOSITORY_NAME`
- `NEXT_PUBLIC_CONTACT_WORKER_URL`
- `NEXT_PUBLIC_ASSISTANT_WORKER_URL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `NEXT_PUBLIC_GITHUB_MODELS_CHAT_MODEL`
- `NEXT_PUBLIC_GITHUB_MODELS_EMBEDDING_MODEL`

### Worker env and secrets

Review these docs before changing worker integrations:

- [docs/contact-form.md](/Users/hassanraza/Projects/Personal-Portfolio/docs/contact-form.md)
- [docs/decap-auth.md](/Users/hassanraza/Projects/Personal-Portfolio/docs/decap-auth.md)
- [cloudflare-worker/README.md](/Users/hassanraza/Projects/Personal-Portfolio/cloudflare-worker/README.md)

## Change Triggers That Require Doc Updates

Update this file and [docs/repo-architecture-graph.md](/Users/hassanraza/Projects/Personal-Portfolio/docs/repo-architecture-graph.md) when you change:

- route structure or page ownership
- content collections, schemas, or grouping logic
- theme tokens, typography, or shared design conventions
- generated artifact inputs or outputs
- assistant retrieval or provider routing flow
- worker endpoints, auth, or contact integration contracts
- CI, deployment, or required environment variables
