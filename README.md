# Hassan Raza Portfolio

Personal portfolio built as a content-driven static site with a real publishing workflow behind it. This repository is not just a visual shell for a resume. It is designed like a product surface: structured content, reusable UI primitives, static deployment, CMS editing, and Git-based publishing.

Live site: `https://hassanraza.us`

## Why This Exists

This project is meant to do two jobs well:

- present my work, thinking, and experience in a polished way
- demonstrate how I design and ship production-minded frontend systems

The result is a portfolio that behaves more like an engineered platform than a one-off marketing page.

## What It Includes

- Next.js static export for GitHub Pages hosting
- Decap CMS for Git-based editing at `/cms-admin`
- MDX and JSON content architecture
- reusable content loaders with schema validation
- content-driven homepage, posts, projects, recommendations, about, and contact pages
- Cloudflare Worker OAuth flow for CMS authentication
- GitHub Actions deployment pipeline
- theme-aware UI built with NextUI and Tailwind CSS

## Engineering Highlights

- **Static-first architecture**: no backend runtime, no SSR dependency, no API routes required for publishing the site
- **Structured content model**: JSON powers structured UI sections, MDX powers long-form content
- **Type-safe content loading**: frontmatter and JSON are validated with Zod before being consumed by the UI
- **Reusable UI system**: homepage sections, cards, recommendation blocks, social links, and layout primitives are componentized
- **Git-based editorial flow**: Decap CMS writes content changes back to GitHub, which then triggers deployment
- **Custom auth integration**: GitHub OAuth is handled through a Cloudflare Worker so the CMS can work on top of GitHub Pages

## Stack

- `Next.js`
- `React`
- `TypeScript`
- `NextUI`
- `Tailwind CSS`
- `MDX`
- `gray-matter`
- `Zod`
- `Decap CMS`
- `Cloudflare Workers`
- `GitHub Actions`

## Project Structure

```text
content/
  about/
  home/
  posts/
  recommendations/
  settings/
public/
  cms-admin/
  images/
src/
  components/
  layouts/
  lib/
  pages/
cloudflare-worker/
```

## Content Model

The site is content-driven by design.

- `content/home`
  homepage hero, stats, and featured focus sections
- `content/posts`
  MDX posts with `contentType` support such as `article`, `case-study`, `news`, and `project`
- `content/recommendations`
  testimonials and endorsements
- `content/about`
  profile, experience, and education content
- `content/settings`
  global site settings, navigation, links, and contact settings

## Local Development

Install dependencies:

```bash
yarn install
```

Start the app:

```bash
yarn dev
```

Clean and restart dev if the local `.next` cache gets stale:

```bash
yarn dev:clean
```

## CMS

The admin UI is available at:

- local: `http://localhost:3000/cms-admin/`
- production: `https://hassanraza.us/cms-admin/`

Decap CMS uses:

- GitHub as the content backend
- a Cloudflare Worker as the OAuth proxy
- `public/images` as the media storage root

This keeps the whole publishing workflow compatible with GitHub Pages and static export.

## Deployment Model

The site is deployed as a static export.

- content changes commit to GitHub
- GitHub Actions builds the site
- the exported output is deployed to GitHub Pages
- the CMS auth Worker is deployed separately through Cloudflare

This keeps hosting simple while still supporting a real editing workflow.

## Commands

```bash
yarn dev
yarn dev:clean
yarn build
yarn lint
```

## Design Principles

- build for clarity before novelty
- keep content separate from presentation
- prefer reusable systems over one-off page code
- make authoring easy without sacrificing deployment simplicity
- ship a portfolio that reflects product thinking, not just visual polish

## Notes

- This repo uses static export conventions, so features are designed to work without a server runtime.
- CMS authentication depends on the Cloudflare Worker configuration and GitHub OAuth setup.
- Media uploaded through the CMS is stored under `public/images`.

## License

This repository represents my personal portfolio and supporting implementation work. Please do not reuse the branding, written content, or personal identity assets without permission.
