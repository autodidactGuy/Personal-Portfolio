import fs from "fs";
import path from "path";

import matter from "gray-matter";

const projectRoot = process.cwd();
const contentRoot = path.join(projectRoot, "content");
const publicRoot = path.join(projectRoot, "public");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(contentRoot, relativePath), "utf8"));
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

const site = readJson("settings/site.json");
const siteUrl = trimTrailingSlash(site.siteUrl);

function createAbsoluteUrl(pathname) {
  const normalizedPath = pathname === "/" ? "/" : `/${pathname.replace(/^\/+/, "")}`;
  return `${siteUrl}${normalizedPath}`;
}

function listPostEntries() {
  const postsDir = path.join(contentRoot, "posts");

  return fs
    .readdirSync(postsDir)
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => {
      const source = fs.readFileSync(path.join(postsDir, fileName), "utf8");
      const { data } = matter(source);

      return {
        slug: fileName.replace(/\.mdx$/, ""),
        frontmatter: data,
      };
    })
    .filter((entry) => entry.frontmatter.published !== false);
}

function buildSitemap() {
  const staticPages = [
    { pathname: "/", priority: "1.0" },
    { pathname: "/about", priority: "0.8" },
    { pathname: "/projects", priority: "0.9" },
    { pathname: "/blog", priority: "0.9" },
    { pathname: "/recommendations", priority: "0.7" },
    { pathname: "/contact", priority: "0.7" },
  ];

  const postPages = listPostEntries().flatMap((entry) => {
    const date = entry.frontmatter.date
      ? new Date(entry.frontmatter.date).toISOString()
      : undefined;

    if (entry.frontmatter.contentType === "project") {
      return [
        {
          pathname: `/project/${entry.slug}`,
          priority: "0.8",
          lastmod: date,
        },
      ];
    }

    return [
      {
        pathname: `/blog/${entry.slug}`,
        priority: "0.8",
        lastmod: date,
      },
    ];
  });

  const urls = [...staticPages, ...postPages]
    .map(({ pathname, priority, lastmod }) => {
      const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";

      return `<url><loc>${createAbsoluteUrl(pathname)}</loc>${lastmodTag}<changefreq>weekly</changefreq><priority>${priority}</priority></url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>
`;
}

function buildRobotsTxt() {
  return `User-agent: *
Allow: /
Disallow: /cms-admin/
Disallow: /admin

Sitemap: ${createAbsoluteUrl("/sitemap.xml")}
`;
}

fs.mkdirSync(publicRoot, { recursive: true });
fs.writeFileSync(path.join(publicRoot, "sitemap.xml"), buildSitemap(), "utf8");
fs.writeFileSync(path.join(publicRoot, "robots.txt"), buildRobotsTxt(), "utf8");
