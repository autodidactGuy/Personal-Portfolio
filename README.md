# Hassan Raza Portfolio

Personal portfolio and publishing platform built as a static-first Next.js application. The site is content-driven, schema-validated, deploys as a static export, and includes an editorial workflow through Decap CMS.

Live site: `https://hassanraza.us`

Featured project write-up:
`https://hassanraza.us/project/building-a-resume-native-ai-assistant`

## Overview

This repository is designed to do more than render a resume. It combines:

- a public portfolio website
- a structured content system for MDX and JSON content
- a static deployment model that works without a server runtime
- a Git-backed CMS workflow for editing and publishing

The site is intentionally built like a small product surface rather than a one-off landing page.

Recent notable product features:

- resume-native AI assistant grounded in published site content
- generated search index for static client-side search
- contact workflow backed by a Cloudflare Worker and Resend
- Git-backed CMS editing through Decap CMS + GitHub OAuth

## Tech Stack

- `Next.js 15`
- `React 19`
- `TypeScript`
- `HeroUI` for UI primitives
- `Tailwind CSS 4`
- `MDX` via `next-mdx-remote`
- `Zod 4` for content validation
- `React Hook Form`
- `Decap CMS`
- `Cloudflare Workers` for OAuth, contact handling, and AI proxying
- `Biome` for linting and formatting
- `GitHub Actions` for build and deployment

## Architecture

### Static-first app

The main app uses:

- `output: "export"` in [next.config.mjs](/Users/hassanraza/Projects/Personal-Portfolio/next.config.mjs)
- static pages under `src/pages`
- no Next.js API routes at runtime
- `images.unoptimized = true` so the export works cleanly on static hosting

Because the site is exported statically, anything that behaves like an API is generated at build time and emitted into `public/`.

Examples:

- `public/api/resume.json` for the assistant knowledge base
- `public/search-index.json` for site search
- generated SEO assets under `public/`

### Content system

The site reads content from the `content/` directory:

- `content/home`
  homepage hero, stats, and featured-focus content
- `content/about`
  profile, experience, and education data
- `content/settings`
  site metadata, links, navigation, and contact settings
- `content/recommendations`
  recommendation/testimonial entries
- `content/posts`
  MDX entries for articles, projects, and case studies

Long-form content lives in MDX. Structured UI content lives in JSON.

### Content loading

[content.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/lib/content.ts) is the main content layer. It:

- reads MDX and JSON files from disk
- validates frontmatter and JSON with Zod schemas from [content.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/types/content.ts)
- filters unpublished posts
- sorts content by published date
- separates blog-like content from project-like content

Current post grouping rules:

- `Projects` includes `project` and `case-study`
- `Blog` includes all other published post types

### Static generated artifacts

Some derived files are generated during development and build:

- `public/api/resume.json`
  generated structured resume-style payload used by the assistant
- `public/search-index.json`
  generated search index used by the site search page
- `src/generated/content-icons.json`
  generated metadata for content icon options
- `public/cms-admin/content-icons.json`
  generated icon metadata for CMS consumption
- `public/sitemap.xml`
  generated sitemap
- `public/robots.txt`
  generated robots file
- `public/og/*`
  generated social preview assets

These are created by scripts in the `scripts/` directory.

## Project Structure

```text
content/
  about/
  home/
  posts/
  recommendations/
  settings/
public/
  api/
  cms-admin/
  images/
  og/
scripts/
src/
  components/
  config/
  generated/
  hooks/
  layouts/
  lib/
  pages/
  styles/
  types/
cloudflare-worker/
```

## Pages

Main pages:

- `/`
  homepage
- `/about`
  profile, experience, education
- `/projects`
  paginated project and case-study listing
- `/project/[slug]`
  individual project or case-study page
- `/blog`
  paginated article-style content listing
- `/blog/[slug]`
  individual blog/article page
- `/recommendations`
  public recommendations
- `/contact`
  contact page and scheduling UI
- `/search`
  search page across about, experience, education, recommendations, and posts
- `/cms-admin/`
  Decap CMS admin interface

Interactive UI surfaces:

- footer assistant launcher opens the resume-grounded AI assistant drawer
- contact page submits to the worker-backed `/contact` endpoint
- search page consumes the generated static search index

## Listing and Search Behavior

### Projects and blog

Listing pages are paginated statically:

- first page remains at `/blog` and `/projects`
- additional pages use `/blog/page/[page]` and `/projects/page/[page]`
- pagination currently uses a page size of `20`

This keeps listing pages lighter as content volume grows.

### Featured content on the homepage

The homepage does not depend on the paginated listing pages. It reads from the full content set and then selects featured items:

- featured projects: published project-like entries with `featured: true`, limited to 2
- featured posts: published blog-like entries with `featured: true`, limited to 4

That means featured homepage content can still come from anywhere in the content set, not just page 1 of a listing page.

### Search

The search page uses a generated static index at `public/search-index.json`.

This keeps the client-side search page fast and avoids shipping the full content graph in page props. The generated index includes:

- blog, project, and case-study entries
- about page content
- experience items
- education items
- recommendations
- taxonomy terms and section keywords such as `education`, `experience`, `projects`, and `blog`

## AI Assistant

The portfolio includes a resume-native AI assistant embedded in the footer launcher. It is designed to answer only from content already published on the site rather than from unstated knowledge or repository activity.

High-level lifecycle:

1. Build time generates `public/api/resume.json` from portfolio JSON and MDX content.
2. The client loads that payload and converts it into normalized snippets.
3. Common questions are answered locally first using deterministic rules.
4. If a model is needed, the client retrieves the most relevant snippets using embeddings or keyword fallback.
5. The client sends only the selected snippets to the Cloudflare Worker `/assistant` endpoint.
6. The worker validates origin, schema, content type, and rate limits before proxying to GitHub Models.
7. The client validates the structured JSON response and renders answers with citations.

Important properties of this design:

- grounded only in published site content
- no frontend exposure of the GitHub Models token
- graceful fallback when embeddings are unavailable
- deterministic handling for high-confidence question patterns
- citation-aware rendering to keep answers inspectable

Related article:
`https://hassanraza.us/project/building-a-resume-native-ai-assistant`

## Commands

### Root app

Install dependencies:

```bash
yarn install
```

Start local development:

```bash
yarn dev
```

Clean `.next` and rerun dev:

```bash
yarn dev:clean
```

Lint:

```bash
yarn lint
```

Lint and auto-fix:

```bash
yarn lint:fix
```

Full build:

```bash
yarn build
```

Serve exported output:

```bash
yarn start
```

`yarn dev` regenerates `resume.json` and `search-index.json` before starting Next.js so local development reflects the latest content-derived artifacts.

### Individual generation scripts

Generate icon metadata:

```bash
yarn icons:generate
```

Generate resume JSON:

```bash
yarn resume:generate
```

Generate search index:

```bash
yarn search:generate
```

Generate sitemap and robots:

```bash
yarn seo:assets
```

Generate OG images:

```bash
yarn seo:og
```

Run all SEO generators:

```bash
yarn seo:generate
```

## Build Pipeline

The main build command is defined in [package.json](/Users/hassanraza/Projects/Personal-Portfolio/package.json):

```bash
yarn lint && yarn seo:assets && yarn resume:generate && yarn search:generate && yarn build:site
```

That means the build:

1. runs Biome checks
2. regenerates SEO assets such as `sitemap.xml` and `robots.txt`
3. regenerates the public resume JSON
4. regenerates the public search index
5. runs `next build` for static export

Local development follows the same static-data philosophy:

- `yarn dev` regenerates `resume.json` and `search-index.json` before booting the app
- `yarn dev:clean` also removes `.next` and `out` first
- generated artifacts are part of the expected working tree for the app

Deployment is handled by [deploy.yml](/Users/hassanraza/Projects/Personal-Portfolio/.github/workflows/deploy.yml), which:

- runs on pushes to `main`
- installs dependencies with `yarn install --frozen-lockfile`
- builds the static export
- uploads the `out/` directory to GitHub Pages

## CMS and Editorial Flow

The project includes Decap CMS under `public/cms-admin/`.

Editorial flow:

1. author signs in through GitHub OAuth
2. Decap CMS writes changes back to the repository
3. GitHub Actions rebuilds and redeploys the site

Because the main site is static, CMS authentication is handled by the companion Cloudflare Worker in `cloudflare-worker/`.

## Cloudflare Worker

The worker now supports three public-facing capabilities:

- `/auth` and `/callback` for Decap CMS GitHub OAuth
- `/contact` for contact form validation and email delivery
- `/assistant` for a safe GitHub Models proxy used by the resume-native AI assistant

The public site shell is still statically rendered, but these workflows rely on the worker for server-only behavior.

Worker responsibilities:

- start GitHub OAuth flow
- validate callback state and allowed origins
- exchange OAuth code for a token
- fetch the authenticated GitHub profile
- allow only configured GitHub usernames
- validate contact submissions and forward email through Resend
- validate assistant requests and proxy them to GitHub Models
- isolate secrets that must never be exposed to the browser
- apply request validation and basic rate limiting to public endpoints

Local worker commands:

```bash
cd cloudflare-worker
yarn install
yarn dev
```

Run worker tests:

```bash
cd cloudflare-worker
yarn test
```

Deploy worker:

```bash
cd cloudflare-worker
yarn install
yarn deploy
```

Do not commit secrets. Configure OAuth values and allowed-user settings through Cloudflare secrets and environment configuration instead.

Companion docs:

- [docs/contact-form.md](/Users/hassanraza/Projects/Personal-Portfolio/docs/contact-form.md)
- [docs/decap-auth.md](/Users/hassanraza/Projects/Personal-Portfolio/docs/decap-auth.md)

## Environment and Configuration

Public client configuration defaults live in [config/public-env.defaults.json](/Users/hassanraza/Projects/Personal-Portfolio/config/public-env.defaults.json). They cover:

- base path and repository name
- contact worker URL
- assistant worker URL
- Turnstile site key
- default GitHub Models chat model
- default GitHub Models embedding model

The runtime accessor is [src/config/public-env.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/config/public-env.ts), which resolves environment overrides first and then falls back to those defaults.

Two especially important frontend-facing values are:

- `NEXT_PUBLIC_CONTACT_WORKER_URL`
- `NEXT_PUBLIC_ASSISTANT_WORKER_URL`

The assistant currently defaults to:

- chat model: `openai/gpt-4o-mini`
- embedding model: `openai/text-embedding-3-small`

## Linting and Formatting

Biome is used for linting and formatting in:

- `src/**/*.js`
- `src/**/*.ts`
- `src/**/*.tsx`
- `cloudflare-worker/src/**/*.js`

Current commands intentionally target source directories only:

```bash
yarn lint
yarn lint:fix
```

These do not lint generated files, build output, or content files.

## Important Technical Decisions

### No runtime API routes

This app uses static export, so Next.js API routes are not available in production. Anything API-like is generated into `public/` during build.

Example:

- `resume.json` is generated by [generate-resume-json.mjs](/Users/hassanraza/Projects/Personal-Portfolio/scripts/generate-resume-json.mjs) and served as a static file
- `search-index.json` is generated by [generate-search-index.mjs](/Users/hassanraza/Projects/Personal-Portfolio/scripts/generate-search-index.mjs) and served as a static file

When true server-only behavior is needed, the repo uses the companion Cloudflare Worker instead of Next.js API routes.

### Base path support

The app supports a configurable base path through:

- `NEXT_PUBLIC_BASE_PATH`
- `BASE_PATH`

This is wired through [base-path.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/lib/base-path.ts) and used for images, admin routing, and static asset links.

This matters for GitHub Pages and other prefixed deployments because generated asset URLs and client fetches need to resolve correctly both locally and in production.

### Assistant retrieval strategy

The assistant uses a retrieval-first architecture rather than sending the entire resume to a model:

- build a normalized snippet set from `resume.json`
- embed and cache snippets client-side using a content hash
- embed the incoming question when embeddings are available
- rank snippets semantically with cosine similarity
- fall back to keyword overlap when embeddings are unavailable
- send only the highest-signal snippets to the model

The core implementation lives in:

- [src/lib/resume-assistant.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/lib/resume-assistant.ts)
- [src/components/resume-assistant.tsx](/Users/hassanraza/Projects/Personal-Portfolio/src/components/resume-assistant.tsx)

### Tailwind and styling

The project uses Tailwind CSS 4 with a TypeScript config and PostCSS integration. Styling is layered on top of HeroUI components and custom theme-aware utility classes.

### MDX rendering

MDX content is rendered through shared components under `src/components/mdx/`. Images are handled through a shared MDX image component that preserves natural aspect ratio more safely than plain markdown image output.

## Recent Improvements and Fixes

This repository has had a number of structural and UX fixes recently. The important ones are:

- upgraded core stack pieces including `Next.js 15`, `React 19`, `Tailwind CSS 4`, `HeroUI`, `TypeScript 6`, and `Zod 4`
- updated the deployment workflow to use `yarn install --frozen-lockfile`
- added Biome linting and formatting commands for application and worker source code
- introduced generated static `resume.json` instead of a runtime API route, because static export does not support Next API routes
- added a resume-native AI assistant that uses retrieval, deterministic shortcuts, and worker-proxied GitHub Models calls
- introduced generated static `search-index.json` for site search
- expanded the Cloudflare Worker beyond CMS OAuth to also support `/contact` and `/assistant`
- fixed the lazy search-index loading loop on the search page
- added static pagination for `/blog` and `/projects` at 20 items per page
- aligned project and blog grouping so projects include `project` and `case-study`, while blog contains the remaining post types
- improved navbar and search synchronization behavior
- fixed invalid navbar list semantics that Lighthouse flagged
- reduced hydration mismatch risk in navbar search rendering
- adjusted mobile input font sizing so iOS browsers are less likely to zoom into focused form fields
- kept homepage featured content independent from paginated archive pages
- added generated icon metadata for CMS-driven content icon selection
- updated experience/about content structure to support highlights, details, and tech tags

## Performance Notes

The site already applies a few patterns that help it scale better:

- static export
- generated search index
- paginated blog and project listings
- homepage featured sections capped to a small number of items

What pagination helps with:

- smaller listing pages
- less markup and client work on `/blog` and `/projects`

What it does not change:

- build-time content loading still reads the full content set
- homepage featured selection still evaluates the full content set
- search index generation still evaluates the full content set

## Accessibility and Lighthouse Notes

Several Lighthouse issues were addressed in app code:

- invalid navbar list semantics
- hydration-sensitive navbar rendering
- mobile form input font sizes that could trigger iOS zoom-on-focus

Some Lighthouse items are mostly hosting concerns rather than React concerns:

- long cache lifetimes for static assets should be configured at the CDN or hosting layer
- static assets under `/_next/static/` and versioned public assets benefit from aggressive caching headers

## Safety and Privacy Notes

This is a public repository. Keep these boundaries in mind:

- do not commit OAuth secrets
- do not commit private API keys
- do not commit personal access tokens
- do not hardcode sensitive environment values in source

For this repository specifically, treat these as secret material:

- `GITHUB_CLIENT_SECRET`
- `GITHUB_MODELS_TOKEN`
- `RESEND_API_KEY`
- `TURNSTILE_SECRET_KEY`

Public site metadata, public profile links, public content, and deployment configuration intended for GitHub Pages are expected to be visible.

## License

This repository represents a personal portfolio and supporting implementation work. It is intentionally **not** distributed under an open-source license.

Please do not reuse the code, branding, written content, personal identity assets, or design work without permission. See [LICENSE](/Users/hassanraza/Projects/Personal-Portfolio/LICENSE) for full terms.
