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

function buildResumePayload() {
  const site = readJson("settings/site.json");
  const hero = readJson("home/hero.json");
  const contact = readJson("settings/contact.json");
  const profile = readJson("about/profile.json");
  const experience = readJson("about/experience.json").items;
  const education = readJson("about/education.json").items;
  const projects = listProjects();
  const siteUrl = trimTrailingSlash(site.siteUrl);
  const skills = uniqueOrdered(experience.flatMap((item) => item.tech || []));

  return {
    name: site.name,
    title: site.title,
    headline: hero.headline,
    summary: profile.summary,
    about: {
      label: profile.pageLabel,
      title: profile.pageTitle,
      description: profile.pageDescription,
      headline: profile.headline,
      summary: profile.summary,
      body: profile.body,
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
    projects: projects.map((project) => ({
      slug: project.slug,
      title: project.frontmatter.title,
      summary: project.frontmatter.summary,
      tags: project.frontmatter.tags || [],
      featured: Boolean(project.frontmatter.featured),
      coverImage: getAbsoluteUrl(siteUrl, project.frontmatter.coverImage || ""),
      url: new URL(`/project/${project.slug}`, siteUrl).toString(),
      date: project.frontmatter.date || undefined,
    })),
  };
}

const outputDir = path.join(publicRoot, "api");
const outputPath = path.join(outputDir, "resume.json");

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(buildResumePayload(), null, 2)}\n`, "utf8");
