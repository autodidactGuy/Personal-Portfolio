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

function withLeadingSlash(value) {
  return value.startsWith("/") ? value : `/${value}`;
}

function getAbsoluteUrl(siteUrl, value) {
  if (!value) {
    return value;
  }

  if (/^https?:\/\//.test(value)) {
    return value;
  }

  return new URL(withLeadingSlash(value), siteUrl).toString();
}

function uniqueOrdered(items) {
  const values = [];

  for (const item of items) {
    const normalizedItem = String(item || "").trim();

    if (normalizedItem && !values.includes(normalizedItem)) {
      values.push(normalizedItem);
    }
  }

  return values;
}

function getInterests(eyebrow) {
  return uniqueOrdered(
    String(eyebrow || "")
      .split(/•|\||,/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function listProjects() {
	const postsDir = path.join(contentRoot, "posts");

  return fs
    .readdirSync(postsDir)
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, "");
      const source = fs.readFileSync(path.join(postsDir, fileName), "utf8");
      const { data } = matter(source);

      return {
        slug,
        frontmatter: data,
      };
    })
    .filter(
      (entry) =>
        entry.frontmatter?.published !== false &&
        (entry.frontmatter?.contentType === "project" ||
          entry.frontmatter?.contentType === "case-study"),
    );
}

function listPosts() {
  const postsDir = path.join(contentRoot, "posts");

  return fs
    .readdirSync(postsDir)
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, "");
      const source = fs.readFileSync(path.join(postsDir, fileName), "utf8");
      const { data, content } = matter(source);

      return {
        slug,
        frontmatter: data,
        content,
      };
    })
    .filter((entry) => entry.frontmatter?.published !== false);
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/^---[\s\S]*?---/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function takeExcerpt(value, maxLength = 900) {
  const normalized = stripMarkdown(value).replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}...`;
}

function buildResumePayload() {
  const site = readJson("settings/site.json");
  const hero = readJson("home/hero.json");
  const stats = readJson("home/stats.json");
  const featuredFocus = readJson("home/featured-focus.json");
  const recommendations = readJson("recommendations/index.json");
  const contact = readJson("settings/contact.json");
  const profile = readJson("about/profile.json");
  const experience = readJson("about/experience.json").items;
  const education = readJson("about/education.json").items;
  const posts = listPosts();
  const projects = posts.filter(
    (entry) => entry.frontmatter?.contentType === "project",
  );
  const articles = posts.filter(
    (entry) => entry.frontmatter?.contentType === "article",
  );
  const caseStudies = posts.filter(
    (entry) => entry.frontmatter?.contentType === "case-study",
  );
  const siteUrl = trimTrailingSlash(site.siteUrl);
  const skills = uniqueOrdered(experience.flatMap((item) => item.tech || []));

  const mapContentEntry = (entry) => ({
    slug: entry.slug,
    title: entry.frontmatter.title,
    summary: entry.frontmatter.summary,
    tags: entry.frontmatter.tags || [],
    featured: Boolean(entry.frontmatter.featured),
    coverImage: getAbsoluteUrl(siteUrl, entry.frontmatter.coverImage || ""),
    url:
      entry.frontmatter.contentType === "project" ||
      entry.frontmatter.contentType === "case-study"
        ? new URL(`/project/${entry.slug}`, siteUrl).toString()
        : new URL(`/blog/${entry.slug}`, siteUrl).toString(),
    date: entry.frontmatter.date || undefined,
    contentType: entry.frontmatter.contentType,
    excerpt: takeExcerpt(entry.content),
  });

  return {
    name: site.name,
    title: site.title,
    headline: hero.headline,
    summary: profile.summary,
    hero: {
      eyebrow: hero.eyebrow,
      headline: hero.headline,
      highlightedText: hero.highlightedText,
      supportingText: hero.supportingText,
      primaryCta: {
        ...hero.primaryCta,
        href: getAbsoluteUrl(siteUrl, hero.primaryCta.href),
      },
      secondaryCta: {
        ...hero.secondaryCta,
        href: getAbsoluteUrl(siteUrl, hero.secondaryCta.href),
      },
    },
    about: {
      label: profile.pageLabel,
      title: profile.pageTitle,
      description: profile.pageDescription,
      headline: profile.headline,
      summary: profile.summary,
      body: profile.body,
    },
    featuredFocus: {
      sectionLabel: featuredFocus.sectionLabel,
      title: featuredFocus.title,
      summary: featuredFocus.summary,
      pillars: featuredFocus.pillars,
      cta: {
        label: featuredFocus.cta.label,
        href: getAbsoluteUrl(siteUrl, featuredFocus.cta.href),
      },
    },
    homeStats: {
      title: stats.title,
      badgeLabel: stats.badgeLabel,
      items: stats.items,
    },
    interests: getInterests(hero.eyebrow),
    skills,
    links: {
      site: siteUrl,
      github: site.links.github,
      linkedin: site.links.linkedin,
      twitter: site.links.twitter,
      resume: getAbsoluteUrl(siteUrl, site.links.resume),
      calendly: site.links.calendly,
    },
    contact: {
      title: contact.title,
      description: contact.description,
      formHeading: contact.formHeading,
      scheduleHeading: contact.scheduleHeading,
      quickLink: {
        label: site.navigation.headerQuickLink.label,
        href: getAbsoluteUrl(siteUrl, site.navigation.headerQuickLink.href),
      },
    },
	recommendations: {
      title: recommendations.title,
      items: recommendations.items.map((item) => ({
        name: item.name,
        role: item.role,
        relationship: item.relationship || undefined,
        quote: item.quote,
        highlight: item.highlight || undefined,
        featured: Boolean(item.featured),
        linkedin: item.linkedin || undefined,
        cta: item.cta || undefined,
      })),
    },
    experience: experience.map((item) => ({
      title: item.title,
      company: item.company,
      companyComments: item.companyComments || undefined,
      location: item.location,
      from: item.from,
      to: item.to,
      highlight: item.highlight,
      details: item.details || [],
      tech: item.tech || [],
      image: getAbsoluteUrl(siteUrl, item.image),
    })),
    education: education.map((item) => ({
      degree: item.degree,
      institute: item.institute,
      location: item.location,
      from: item.from,
      to: item.to,
      result: item.result || undefined,
      image: getAbsoluteUrl(siteUrl, item.image),
    })),
    projects: projects.map(mapContentEntry),
    articles: articles.map(mapContentEntry),
    caseStudies: caseStudies.map(mapContentEntry),
  };
}

const outputDir = path.join(publicRoot, "api");
const outputPath = path.join(outputDir, "resume.json");

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(buildResumePayload(), null, 2)}\n`, "utf8");
