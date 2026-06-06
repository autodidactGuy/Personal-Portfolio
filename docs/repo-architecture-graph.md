# Repo Architecture Graph

This file is the graph-style source of truth for how the repo fits together.

Update this file in the same change whenever nodes, edges, ownership, generated outputs, or deployment paths change.

## System Graph

```mermaid
flowchart TD
    A["content/settings/*.json"] --> B["src/config/site.ts"]
    C["content/about/*.json"] --> D["src/lib/content.ts"]
    E["content/home/*.json"] --> D
    F["content/recommendations/index.json"] --> D
    G["content/posts/*.mdx"] --> D
    H["src/types/content.ts"] --> D

    D --> I["src/pages/*"]
    D --> J["scripts/generate-resume-json.mjs"]
    D --> K["scripts/generate-search-index.mjs"]

    L["src/styles/globals.css"] --> M["All React pages and components"]
    N["src/config/fonts.ts"] --> O["src/pages/_app.tsx"]
    P["tailwind.config.ts"] --> L

    B --> Q["src/lib/seo.ts"]
    Q --> R["src/layouts/head.tsx"]
    S["scripts/generate-seo-assets.mjs"] --> T["public/sitemap.xml + public/robots.txt"]
    U["scripts/generate-og-images.mjs"] --> V["public/og/*"]

    J --> W["public/api/resume.json"]
    K --> X["public/search-index.json"]
    Y["scripts/generate-content-icons.mjs"] --> Z["src/generated/content-icons.json + public/cms-admin/content-icons.json"]

    I --> AA["Static export via next build"]
    R --> AA
    T --> AA
    V --> AA
    W --> AA
    X --> AA

    W --> AB["cloudflare-worker/scripts/build-rag-dataset.ts"]
    G --> AB
    C --> AB
    F --> AB
    AB --> AC["cloudflare-worker/scripts/ingest.ts"]
    AC --> AD["Cloudflare Vectorize + R2"]

    AE["src/components/resume-assistant.tsx"] --> AF["Cloudflare Worker endpoints"]
    AG["src/pages/contact.tsx"] --> AF
    AH["public/cms-admin/*"] --> AF

    AF --> AI["cloudflare-worker/src/index.ts"]
    AI --> AJ["contact flow"]
    AI --> AK["Decap OAuth flow"]
    AI --> AL["assistant routing"]
    AI --> AM["semantic retrieval"]

    AN[".github/workflows/deploy.yml"] --> AO["GitHub Pages deploy"]
    AP[".github/workflows/deploy-worker.yml"] --> AQ["Cloudflare Worker deploy"]
```

## Node Notes

- `src/lib/content.ts` is the content orchestration hub for the site.
- `src/types/content.ts` is the schema boundary for content files.
- `src/styles/globals.css` owns color tokens and theme variables.
- `src/config/fonts.ts` owns font families.
- `src/lib/seo.ts` plus `src/layouts/head.tsx` own metadata and structured data behavior.
- `public/*` generated assets are downstream outputs and should not become manual truth sources.
- The worker depends on portfolio content and generated resume data for RAG ingestion and assistant quality.

## Update Rules

Update this graph when any of the following changes happen:

- A new content collection, generated artifact, or build script is added.
- A page starts reading from a different content or config source.
- A new worker endpoint, provider, or storage dependency is introduced.
- Deployment ownership moves between GitHub Pages, Cloudflare, or another platform.
- The design system source of truth moves away from the current token files.
- The app stops being static-first or gains a new server/runtime path.
