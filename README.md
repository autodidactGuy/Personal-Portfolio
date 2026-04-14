# Hassan Raza Portfolio

Personal portfolio and publishing platform built as a static-first Next.js application. The site is content-driven, schema-validated, deploys as a static export, and includes an editorial workflow through Decap CMS.

Live site: `https://hassanraza.us`

## Overview

This repository is designed to do more than render a resume. It combines:

- a public portfolio website
- a structured content system for MDX and JSON content
- a static deployment model that works without a server runtime
- a Git-backed CMS workflow for editing and publishing

The site is intentionally built like a small product surface rather than a one-off landing page.

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
- `Cloudflare Workers` for CMS OAuth
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
  generated structured resume-style payload
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

The worker is only for Decap CMS authentication. It is not required to render the public site.

Worker responsibilities:

- start GitHub OAuth flow
- validate callback state and allowed origins
- exchange OAuth code for a token
- fetch the authenticated GitHub profile
- allow only configured GitHub usernames

Local worker commands:

```bash
cd cloudflare-worker
yarn install
yarn dev
```

Deploy worker:

```bash
cd cloudflare-worker
yarn install
yarn deploy
```

Do not commit secrets. Configure OAuth values and allowed-user settings through Cloudflare secrets and environment configuration instead.

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

### Base path support

The app supports a configurable base path through:

- `NEXT_PUBLIC_BASE_PATH`
- `BASE_PATH`

This is wired through [base-path.ts](/Users/hassanraza/Projects/Personal-Portfolio/src/lib/base-path.ts) and used for images, admin routing, and static asset links.

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
- introduced generated static `search-index.json` for site search
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

Public site metadata, public profile links, public content, and deployment configuration intended for GitHub Pages are expected to be visible.

## License

This repository represents a personal portfolio and supporting implementation work. It is intentionally **not** distributed under an open-source license.

Please do not reuse the code, branding, written content, personal identity assets, or design work without permission. See [LICENSE](/Users/hassanraza/Projects/Personal-Portfolio/LICENSE) for full terms.
