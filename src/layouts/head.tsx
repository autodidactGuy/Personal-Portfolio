import React from "react";
import NextHead from "next/head";

import { siteConfig, withBasePath } from "@/config/site";
import { buildSeo, type SeoEntry } from "@/lib/seo";

type HeadProps = {
  seo?: SeoEntry;
};

export const Head = ({ seo }: HeadProps) => {
  const resolvedSeo = buildSeo(seo);
  const favicon = withBasePath(siteConfig.avatar);
  const twitterHandle = siteConfig.links.twitter.split("/").filter(Boolean).pop();
  const robots = resolvedSeo.noindex ? "noindex,nofollow" : "index,follow";

  return (
    <NextHead>
      <title>{resolvedSeo.title}</title>
      <meta
        key="viewport"
        content="viewport-fit=cover, width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
        name="viewport"
      />
      <meta name="description" content={resolvedSeo.description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={resolvedSeo.canonical} />

      <meta property="og:site_name" content={siteConfig.name} />
      <meta property="og:title" content={resolvedSeo.title} />
      <meta property="og:description" content={resolvedSeo.description} />
      <meta property="og:url" content={resolvedSeo.canonical} />
      <meta property="og:type" content={resolvedSeo.type} />
      {resolvedSeo.absoluteImage ? <meta property="og:image" content={resolvedSeo.absoluteImage} /> : null}

      <meta name="twitter:card" content={resolvedSeo.absoluteImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={resolvedSeo.title} />
      <meta name="twitter:description" content={resolvedSeo.description} />
      {resolvedSeo.absoluteImage ? <meta name="twitter:image" content={resolvedSeo.absoluteImage} /> : null}
      {twitterHandle ? <meta name="twitter:creator" content={`@${twitterHandle}`} /> : null}

      {resolvedSeo.publishedTime ? (
        <meta property="article:published_time" content={resolvedSeo.publishedTime} />
      ) : null}
      {resolvedSeo.tags.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      <link href={favicon} rel="icon" sizes="16x16 32x32" type="image/png" />
      <link href={favicon} rel="apple-touch-icon" />

      {resolvedSeo.structuredData.map((entry, index) => (
        <script
          key={`structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
    </NextHead>
  );
};
