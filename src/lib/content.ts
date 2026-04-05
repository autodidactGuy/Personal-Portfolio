import fs from "fs";
import path from "path";

import matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";
import { z } from "zod";

import {
  aboutProfileSchema,
  blogFrontmatterSchema,
  contactSettingsSchema,
  contentFrontmatterSchema,
  educationListSchema,
  experienceListSchema,
  homeHeroSchema,
  homeStatsSchema,
  proposedEndeavorSchema,
  recommendationsSchema,
  siteSettingsSchema,
  type BlogFrontmatter,
  type ContentCollection,
  type ContentEntry,
  type ContentFrontmatter,
} from "@/types/content";

const CONTENT_ROOT = path.join(process.cwd(), "content");

function readFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing content file: ${filePath}`);
  }

  return fs.readFileSync(filePath, "utf8");
}

function parseJsonFile<TSchema extends z.ZodTypeAny>(relativePath: string, schema: TSchema): z.output<TSchema> {
  const fullPath = path.join(CONTENT_ROOT, relativePath);
  const rawContent = readFile(fullPath);

  try {
    return schema.parse(JSON.parse(rawContent));
  } catch (error) {
    throw new Error(`Invalid JSON content in ${relativePath}: ${String(error)}`);
  }
}

function readMdxEntry<TSchema extends z.ZodTypeAny>(
  collection: ContentCollection,
  slug: string,
  schema: TSchema
): ContentEntry<z.output<TSchema>> {
  const fullPath = path.join(CONTENT_ROOT, collection, `${slug}.mdx`);
  const source = readFile(fullPath);
  const { data, content } = matter(source);

  try {
    return {
      slug,
      frontmatter: schema.parse(data),
      content,
    };
  } catch (error) {
    throw new Error(`Invalid frontmatter in ${collection}/${slug}.mdx: ${String(error)}`);
  }
}

function listSlugs(collection: ContentCollection) {
  const directory = path.join(CONTENT_ROOT, collection);

  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => fileName.replace(/\.mdx$/, ""))
    .sort();
}

function byPublishedDateDesc<T extends { date?: string }>(
  a: ContentEntry<T>,
  b: ContentEntry<T>
) {
  const aDate = a.frontmatter.date ? new Date(a.frontmatter.date).getTime() : 0;
  const bDate = b.frontmatter.date ? new Date(b.frontmatter.date).getTime() : 0;

  return bDate - aDate;
}

export function getPageContent<TSchema extends z.ZodTypeAny>(relativePath: string, schema: TSchema): z.output<TSchema> {
  return parseJsonFile(relativePath, schema);
}

export function getSiteSettings() {
  return getPageContent("settings/site.json", siteSettingsSchema);
}

export function getContactSettings() {
  return getPageContent("settings/contact.json", contactSettingsSchema);
}

export function getHomeHero() {
  return getPageContent("home/hero.json", homeHeroSchema);
}

export function getHomeStats() {
  return getPageContent("home/stats.json", homeStatsSchema);
}

export function getProposedEndeavor() {
  return getPageContent("home/niw.json", proposedEndeavorSchema);
}

export function getRecommendations() {
  return getPageContent("recommendations/index.json", recommendationsSchema);
}

export function getAboutProfile() {
  return getPageContent("about/profile.json", aboutProfileSchema);
}

export function getExperience() {
  return getPageContent("about/experience.json", experienceListSchema).items;
}

export function getEducation() {
  return getPageContent("about/education.json", educationListSchema).items;
}

export function getAllPosts() {
  return listSlugs("blog")
    .map((slug) => readMdxEntry("blog", slug, blogFrontmatterSchema))
    .filter((entry) => entry.frontmatter.published)
    .sort(byPublishedDateDesc);
}

export function getProjects() {
  return listSlugs("projects")
    .map((slug) => readMdxEntry("projects", slug, contentFrontmatterSchema))
    .filter((entry) => entry.frontmatter.published);
}

export function getCaseStudies() {
  return listSlugs("case-studies")
    .map((slug) => readMdxEntry("case-studies", slug, contentFrontmatterSchema))
    .filter((entry) => entry.frontmatter.published);
}

export function getCollectionSlugs(collection: ContentCollection) {
  return listSlugs(collection);
}

export function getBlogPostBySlug(slug: string) {
  return readMdxEntry("blog", slug, blogFrontmatterSchema);
}

export function getProjectBySlug(slug: string) {
  return readMdxEntry("projects", slug, contentFrontmatterSchema);
}

export function getCaseStudyBySlug(slug: string) {
  return readMdxEntry("case-studies", slug, contentFrontmatterSchema);
}

export async function compileMdx(source: string) {
  return serialize(source, {
    mdxOptions: {
      development: process.env.NODE_ENV === "development",
    },
  });
}
