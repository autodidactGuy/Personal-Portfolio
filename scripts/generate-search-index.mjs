import fs from "fs";
import path from "path";
import matter from "gray-matter";

const projectRoot = process.cwd();
const contentRoot = path.join(projectRoot, "content");
const publicRoot = path.join(projectRoot, "public");
const outputPath = path.join(publicRoot, "search-index.json");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(contentRoot, relativePath), "utf8"));
}

function readMdxEntries() {
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

function compactText(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, " ")
    .replace(/[*_~>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSnippet(content, maxLength = 1200) {
  return compactText(content).slice(0, maxLength);
}

function buildSearchText(parts) {
  return compactText(parts.filter(Boolean).join(" "));
}

function buildIndex() {
  const profile = readJson("about/profile.json");
  const experience = readJson("about/experience.json").items;
  const education = readJson("about/education.json").items;
  const recommendations = readJson("recommendations/index.json").items;
  const posts = readMdxEntries();

  const aboutEntry = {
    id: "about-overview",
    type: "about",
    typeLabel: "About",
    title: profile.pageTitle,
    summary: profile.summary,
    href: "/about",
    meta: profile.aboutSectionTitle,
    keywords: ["about", "profile", "overview", "bio", "summary"],
    searchText: buildSearchText([
      "about profile overview bio summary",
      profile.pageLabel,
      profile.pageTitle,
      profile.pageDescription,
      profile.aboutSectionTitle,
      profile.aboutSectionSubtitle,
      profile.summaryLabel,
      profile.headline,
      profile.summary,
      ...(profile.body || []),
    ]),
  };

  const experienceEntries = experience.map((item, index) => ({
    id: `experience-${index}-${item.company}-${item.title}`,
    type: "experience",
    typeLabel: "Experience",
    title: `${item.title} at ${item.company}`,
    summary: item.highlight,
    href: "/about",
    meta: `${item.from} - ${item.to} • ${item.location}`,
    keywords: uniqueOrdered([
      "experience",
      "work",
      "career",
      "employment",
      "professional",
      item.company,
      ...(item.tech || []),
    ]),
    searchText: buildSearchText([
      "experience work career employment professional",
      item.title,
      item.company,
      item.companyComments,
      item.location,
      item.from,
      item.to,
      item.highlight,
      ...(item.details || []),
      ...(item.tech || []),
    ]),
  }));

  const educationEntries = education.map((item, index) => ({
    id: `education-${index}-${item.institute}-${item.degree}`,
    type: "education",
    typeLabel: "Education",
    title: item.degree,
    summary: item.institute,
    href: "/about",
    meta: `${item.from} - ${item.to} • ${item.location}`,
    keywords: uniqueOrdered([
      "education",
      "academic",
      "degree",
      "university",
      "school",
      item.institute,
      item.degree,
    ]),
    searchText: buildSearchText([
      "education academic degree university school",
      item.degree,
      item.institute,
      item.location,
      item.from,
      item.to,
      item.result,
    ]),
  }));

  const recommendationEntries = recommendations.map((item, index) => ({
    id: `recommendation-${index}-${item.name}`,
    type: "recommendation",
    typeLabel: "Recommendation",
    title: item.name,
    summary: item.highlight || item.quote,
    href: "/recommendations",
    meta: item.role,
    keywords: uniqueOrdered([
      "recommendation",
      "recommendations",
      "testimonial",
      "endorsement",
      "feedback",
      item.relationship,
      item.name,
    ]),
    searchText: buildSearchText([
      "recommendation recommendations testimonial endorsement feedback",
      item.name,
      item.role,
      item.relationship,
      item.highlight,
      item.quote,
    ]),
  }));

  const postEntries = posts.map((entry) => {
    const isProject = entry.frontmatter?.contentType === "project";
    const isCaseStudy = entry.frontmatter?.contentType === "case-study";
    const type = isProject ? "project" : isCaseStudy ? "case-study" : "article";
    const typeLabel = isProject
      ? "Project"
      : isCaseStudy
        ? "Case Study"
        : "Article";
    const sectionTerms = isProject
      ? "projects project portfolio work case study case studies"
      : isCaseStudy
        ? "case study case studies project projects portfolio work"
        : "blog blogs article articles writing post posts note tutorial announcement news";

    return {
      id: `${entry.frontmatter?.contentType || "post"}-${entry.slug}`,
      type,
      typeLabel,
      title: entry.frontmatter?.title || entry.slug,
      summary: entry.frontmatter?.summary || "",
      href: type === "article" ? `/blog/${entry.slug}` : `/project/${entry.slug}`,
      meta: entry.frontmatter?.date || undefined,
      keywords: uniqueOrdered([
        ...sectionTerms.split(" "),
        ...(entry.frontmatter?.tags || []),
        entry.frontmatter?.contentType || "",
      ]),
      searchText: buildSearchText([
        sectionTerms,
        entry.frontmatter?.title,
        entry.frontmatter?.summary,
        entry.frontmatter?.contentType,
        entry.frontmatter?.date,
        ...(entry.frontmatter?.tags || []),
        getSnippet(entry.content),
      ]),
    };
  });

  return [
    aboutEntry,
    ...experienceEntries,
    ...educationEntries,
    ...postEntries,
    ...recommendationEntries,
  ];
}

fs.mkdirSync(publicRoot, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(buildIndex(), null, 2)}\n`, "utf8");
