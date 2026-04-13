import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";
import type { z } from "zod";

import {
	aboutProfileSchema,
	type ContentCollection,
	type ContentEntry,
	contactSettingsSchema,
	educationListSchema,
	experienceListSchema,
	featuredFocusSchema,
	homeHeroSchema,
	homeStatsSchema,
	PostContentTypeEnum,
	postFrontmatterSchema,
	recommendationsSchema,
	type SearchIndexEntry,
	siteSettingsSchema,
} from "@/types/content";

const CONTENT_ROOT = path.join(process.cwd(), "content");

function readFile(filePath: string) {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Missing content file: ${filePath}`);
	}

	return fs.readFileSync(filePath, "utf8");
}

function parseJsonFile<TSchema extends z.ZodTypeAny>(
	relativePath: string,
	schema: TSchema,
): z.output<TSchema> {
	const fullPath = path.join(CONTENT_ROOT, relativePath);
	const rawContent = readFile(fullPath);

	try {
		return schema.parse(JSON.parse(rawContent));
	} catch (error) {
		throw new Error(
			`Invalid JSON content in ${relativePath}: ${String(error)}`,
		);
	}
}

function readMdxEntry<TSchema extends z.ZodTypeAny>(
	collection: ContentCollection,
	slug: string,
	schema: TSchema,
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
		throw new Error(
			`Invalid frontmatter in ${collection}/${slug}.mdx: ${String(error)}`,
		);
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
	b: ContentEntry<T>,
) {
	const aDate = a.frontmatter.date ? new Date(a.frontmatter.date).getTime() : 0;
	const bDate = b.frontmatter.date ? new Date(b.frontmatter.date).getTime() : 0;

	return bDate - aDate;
}

function isProjectLikeContentType(contentType: PostContentTypeEnum) {
	return (
		contentType === PostContentTypeEnum.Project ||
		contentType === PostContentTypeEnum.CaseStudy
	);
}

export function getPageContent<TSchema extends z.ZodTypeAny>(
	relativePath: string,
	schema: TSchema,
): z.output<TSchema> {
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

export function getFeaturedFocus() {
	return getPageContent("home/featured-focus.json", featuredFocusSchema);
}

export function getRecommendations() {
	return getPageContent("recommendations/index.json", recommendationsSchema);
}

export function getFeaturedRecommendations() {
	const recommendations = getRecommendations();

	return {
		...recommendations,
		items: recommendations.items.filter(
			(recommendation) => recommendation.featured,
		),
	};
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

export function getPosts() {
	return listSlugs("posts")
		.map((slug) => readMdxEntry("posts", slug, postFrontmatterSchema))
		.filter((entry) => entry.frontmatter.published)
		.sort(byPublishedDateDesc);
}

export function getBlogPosts() {
	return getPosts().filter(
		(entry) => !isProjectLikeContentType(entry.frontmatter.contentType),
	);
}

export function getProjects() {
	return getPosts().filter((entry) =>
		isProjectLikeContentType(entry.frontmatter.contentType),
	);
}

export function getCollectionSlugs(collection: ContentCollection) {
	return listSlugs(collection);
}

export function getProjectSlugs() {
	return getProjects().map((project) => project.slug);
}

export function getPostBySlug(slug: string) {
	return readMdxEntry("posts", slug, postFrontmatterSchema);
}

export function getProjectBySlug(slug: string) {
	const project = getPostBySlug(slug);

	if (!isProjectLikeContentType(project.frontmatter.contentType)) {
		throw new Error(
			`Post "${slug}" is not a ${PostContentTypeEnum.Project} or ${PostContentTypeEnum.CaseStudy}`,
		);
	}

	return project;
}

export function getBlogBySlug(slug: string) {
	const blog = getPostBySlug(slug);

	if (isProjectLikeContentType(blog.frontmatter.contentType)) {
		throw new Error(
			`Post "${slug}" is not a blog post (it is a ${blog.frontmatter.contentType})`,
		);
	}

	return blog;
}

export async function compileMdx(source: string) {
	return serialize(source, {
		mdxOptions: {
			development: process.env.NODE_ENV === "development",
		},
	});
}

export function getSearchIndex(): SearchIndexEntry[] {
	const profile = getAboutProfile();
	const experience = getExperience();
	const education = getEducation();
	const recommendations = getRecommendations();
	const posts = getPosts();

	const aboutEntry: SearchIndexEntry = {
		id: "about-overview",
		type: "about",
		typeLabel: "About",
		title: profile.pageTitle,
		summary: profile.summary,
		href: "/about",
		meta: profile.aboutSectionTitle,
		keywords: [],
		searchText: [
			profile.pageLabel,
			profile.pageTitle,
			profile.pageDescription,
			profile.aboutSectionTitle,
			profile.aboutSectionSubtitle,
			profile.summaryLabel,
			profile.headline,
			profile.summary,
			...profile.body,
		].join(" "),
	};

	const experienceEntries: SearchIndexEntry[] = experience.map(
		(item, index) => ({
			id: `experience-${index}-${item.company}-${item.title}`,
			type: "experience",
			typeLabel: "Experience",
			title: `${item.title} at ${item.company}`,
			summary: item.highlight,
			href: "/about",
			meta: `${item.from} - ${item.to} • ${item.location}`,
			keywords: [item.company, ...item.tech],
			searchText: [
				item.title,
				item.company,
				item.companyComments,
				item.location,
				item.from,
				item.to,
				item.highlight,
				...item.details,
				...item.tech,
			].join(" "),
		}),
	);

	const educationEntries: SearchIndexEntry[] = education.map((item, index) => ({
		id: `education-${index}-${item.institute}-${item.degree}`,
		type: "education",
		typeLabel: "Education",
		title: item.degree,
		summary: item.institute,
		href: "/about",
		meta: `${item.from} - ${item.to} • ${item.location}`,
		keywords: [item.institute],
		searchText: [
			item.degree,
			item.institute,
			item.location,
			item.from,
			item.to,
			item.result,
		].join(" "),
	}));

	const recommendationEntries: SearchIndexEntry[] = recommendations.items.map(
		(item, index) => ({
			id: `recommendation-${index}-${item.name}`,
			type: "recommendation",
			typeLabel: "Recommendation",
			title: item.name,
			summary: item.highlight || item.quote,
			href: "/recommendations",
			meta: item.role,
			keywords: [item.relationship],
			searchText: [
				item.name,
				item.role,
				item.relationship,
				item.highlight,
				item.quote,
			].join(" "),
		}),
	);

	const postEntries: SearchIndexEntry[] = posts.map((entry) => {
		const isProjectLike =
			entry.frontmatter.contentType === PostContentTypeEnum.Project ||
			entry.frontmatter.contentType === PostContentTypeEnum.CaseStudy;
		const type: SearchIndexEntry["type"] =
			entry.frontmatter.contentType === PostContentTypeEnum.Project
				? "project"
				: entry.frontmatter.contentType === PostContentTypeEnum.CaseStudy
					? "case-study"
					: "article";

		return {
			id: `${entry.frontmatter.contentType}-${entry.slug}`,
			type,
			typeLabel:
				entry.frontmatter.contentType === PostContentTypeEnum.CaseStudy
					? "Case Study"
					: entry.frontmatter.contentType === PostContentTypeEnum.Project
						? "Project"
						: "Article",
			title: entry.frontmatter.title,
			summary: entry.frontmatter.summary,
			href: isProjectLike ? `/project/${entry.slug}` : `/blog/${entry.slug}`,
			meta: entry.frontmatter.date,
			keywords: entry.frontmatter.tags,
			searchText: [
				entry.frontmatter.title,
				entry.frontmatter.summary,
				entry.frontmatter.contentType,
				entry.frontmatter.date,
				...entry.frontmatter.tags,
				entry.content,
			].join(" "),
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
