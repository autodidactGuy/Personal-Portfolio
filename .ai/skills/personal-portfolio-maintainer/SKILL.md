---
name: personal-portfolio-maintainer
description: Use when changing this Personal-Portfolio repo so work stays aligned with its static-first Next.js architecture, content schemas, SEO system, generated artifacts, Cloudflare Worker integrations, and repo-specific maintenance rules.
---

# Personal Portfolio Maintainer

Use this skill for any non-trivial change in this repository.

## Load These References First

- [AGENTS.md](/Users/hassanraza/Projects/Personal-Portfolio/AGENTS.md)
- [docs/repo-maintenance.md](/Users/hassanraza/Projects/Personal-Portfolio/docs/repo-maintenance.md)
- [docs/repo-architecture-graph.md](/Users/hassanraza/Projects/Personal-Portfolio/docs/repo-architecture-graph.md)

Read these only if the task touches them:

- [docs/contact-form.md](/Users/hassanraza/Projects/Personal-Portfolio/docs/contact-form.md)
- [docs/decap-auth.md](/Users/hassanraza/Projects/Personal-Portfolio/docs/decap-auth.md)
- [cloudflare-worker/README.md](/Users/hassanraza/Projects/Personal-Portfolio/cloudflare-worker/README.md)

## Working Rules

1. Confirm whether the change affects the static site, the worker, or both.
2. Find the real source of truth before editing.
3. Prefer extending current patterns instead of introducing parallel systems.
4. Regenerate derived artifacts when their inputs change.
5. Update repo docs when architecture, contracts, or ownership change.

## Source-Of-Truth Map

- Theme tokens: `src/styles/globals.css`
- Font stacks: `src/config/fonts.ts`
- Content schemas: `src/types/content.ts`
- Content loading/grouping: `src/lib/content.ts`
- Site identity/nav/links: `content/settings/site.json`
- SEO behavior: `src/lib/seo.ts` and `src/layouts/head.tsx`
- Build and generators: `package.json` and `scripts/*`
- Worker contracts: `cloudflare-worker/src/index.ts` and `cloudflare-worker/src/rag/*`

## Required Checks

Run the smallest set that honestly validates the change:

- `yarn lint`
- `yarn typecheck`
- `yarn build`
- `cd cloudflare-worker && yarn test`
- `cd cloudflare-worker && yarn typecheck`

If content, SEO, or assistant inputs changed, also run the relevant generator scripts.

## Mandatory Follow-Through

Update `docs/repo-architecture-graph.md` and `docs/repo-maintenance.md` whenever the change affects:

- architecture or data flow
- source-of-truth ownership
- generated outputs
- env vars or deployment
- worker endpoints or assistant behavior
