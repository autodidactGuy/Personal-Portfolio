import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const linkRecordSchema = z.record(z.string(), z.string().url()).optional();

const personalSchema = z
	.object({
		name: z.string().trim().min(1),
		title: z.string().trim().optional(),
		headline: z.string().trim().optional(),
		summary: z.string().trim().optional(),
		bio: z.union([z.string().trim(), z.array(z.string().trim())]).optional(),
		skills: z.array(z.string().trim()).optional(),
		tags: z.array(z.string().trim()).optional(),
		links: linkRecordSchema,
	})
	.passthrough()
	.default({ name: "Unknown" });

const experienceItemSchema = z
	.object({
		id: z.string().trim().optional(),
		title: z.string().trim().min(1),
		company: z.string().trim().min(1),
		location: z.string().trim().optional(),
		startDate: z.string().trim().optional(),
		endDate: z.string().trim().optional(),
		summary: z.string().trim().optional(),
		highlights: z.array(z.string().trim()).optional(),
		details: z.array(z.string().trim()).optional(),
		tech: z.array(z.string().trim()).optional(),
		url: z.string().trim().url().optional(),
		slug: z.string().trim().optional(),
		tags: z.array(z.string().trim()).optional(),
		priority: z.number().int().nonnegative().optional(),
	})
	.passthrough();

const educationItemSchema = z
	.object({
		id: z.string().trim().optional(),
		degree: z.string().trim().min(1),
		institute: z.string().trim().min(1),
		location: z.string().trim().optional(),
		startDate: z.string().trim().optional(),
		endDate: z.string().trim().optional(),
		summary: z.string().trim().optional(),
		highlights: z.array(z.string().trim()).optional(),
		url: z.string().trim().url().optional(),
		slug: z.string().trim().optional(),
		tags: z.array(z.string().trim()).optional(),
		priority: z.number().int().nonnegative().optional(),
	})
	.passthrough();

const entrySectionSchema = z
	.object({
		heading: z.string().trim().min(1),
		content: z.union([z.string().trim(), z.array(z.string().trim())]),
	})
	.passthrough();

const entrySchema = z
	.object({
		id: z.string().trim().optional(),
		sourceType: z.string().trim().optional(),
		title: z.string().trim().min(1),
		slug: z.string().trim().optional(),
		url: z.string().trim().url().optional(),
		excerpt: z.string().trim().optional(),
		summary: z.string().trim().optional(),
		body: z.union([z.string().trim(), z.array(z.string().trim())]).optional(),
		content: z.union([z.string().trim(), z.array(z.string().trim())]).optional(),
		sections: z.array(entrySectionSchema).optional(),
		tags: z.array(z.string().trim()).optional(),
		priority: z.number().int().nonnegative().optional(),
		date: z.string().trim().optional(),
	})
	.passthrough();

const rawDatasetSchema = z
	.object({
		personal: personalSchema.optional(),
		basic: personalSchema.optional(),
		profile: personalSchema.optional(),
		experience: z.array(experienceItemSchema).optional(),
		education: z.array(educationItemSchema).optional(),
		entries: z.array(entrySchema).optional(),
		posts: z.array(entrySchema).optional(),
		portfolio: z.array(entrySchema).optional(),
	})
	.passthrough();

export type NormalizedChunkSourceType =
	| "personal"
	| "hero"
	| "about"
	| "focus"
	| "stats"
	| "interest"
	| "skill"
	| "link"
	| "contact"
	| "recommendation"
	| "experience"
	| "education"
	| "post"
	| "project"
	| "article"
	| "portfolio"
	| "case-study";

export type NormalizedRecord = {
	recordId: string;
	sourceType: NormalizedChunkSourceType;
	title: string;
	slug?: string;
	url?: string;
	tags: string[];
	priority: number;
	summary?: string;
	sections: Array<{
		heading: string;
		content: string;
	}>;
};

export type NormalizedDataset = {
	records: NormalizedRecord[];
};

function toParagraphText(value?: string | string[]) {
	if (!value) {
		return "";
	}

	return Array.isArray(value)
		? value.map((item) => item.trim()).filter(Boolean).join("\n\n")
		: value.trim();
}

function normalizeSourceType(rawType?: string): NormalizedChunkSourceType {
	const normalized = String(rawType || "portfolio").trim().toLowerCase();

	switch (normalized) {
		case "personal":
		case "profile":
		case "basic":
			return "personal";
		case "hero":
			return "hero";
		case "about":
			return "about";
		case "focus":
		case "featured-focus":
			return "focus";
		case "stats":
		case "home-stats":
			return "stats";
		case "interest":
		case "interests":
			return "interest";
		case "skill":
		case "skills":
			return "skill";
		case "link":
		case "links":
			return "link";
		case "contact":
			return "contact";
		case "recommendation":
		case "recommendations":
		case "testimonial":
			return "recommendation";
		case "experience":
			return "experience";
		case "education":
			return "education";
		case "project":
			return "project";
		case "article":
		case "blog":
			return "article";
		case "case-study":
		case "case_study":
		case "casestudy":
			return "case-study";
		case "post":
			return "post";
		default:
			return "portfolio";
	}
}

function slugifyRecord(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function createRecordId(sourceType: string, slugOrTitle: string) {
	return `${sourceType}:${slugifyRecord(slugOrTitle || sourceType)}`;
}

export async function loadDataset(datasetPath: string) {
	const absolutePath = path.resolve(datasetPath);
	const rawFile = await fs.readFile(absolutePath, "utf8");
	const parsed = rawDatasetSchema.parse(JSON.parse(rawFile));

	const personal = parsed.personal || parsed.basic || parsed.profile;
	const experience = parsed.experience || [];
	const education = parsed.education || [];
	const entries = parsed.entries || parsed.posts || parsed.portfolio || [];

	const records: NormalizedRecord[] = [];

	if (personal) {
		const aboutBits = [
			personal.title,
			personal.headline,
			personal.summary,
			toParagraphText(personal.bio),
		].filter(Boolean);
		const linkSummary = personal.links
			? Object.entries(personal.links)
					.map(([label, url]) => `${label}: ${url}`)
					.join("\n")
			: "";

		records.push({
			recordId: createRecordId("personal", personal.name),
			sourceType: "personal",
			title: personal.name,
			tags: [...(personal.tags || []), ...(personal.skills || [])],
			priority: 10,
			summary: [personal.title, personal.headline, personal.summary]
				.filter(Boolean)
				.join(" — "),
			sections: [
				{
					heading: "profile",
					content: aboutBits.join("\n\n").trim(),
				},
				{
					heading: "skills",
					content: (personal.skills || []).join(", "),
				},
				{
					heading: "links",
					content: linkSummary,
				},
			].filter((section) => section.content),
		});
	}

	for (const item of experience) {
		const title = `${item.title} at ${item.company}`;
		const details = [...(item.highlights || []), ...(item.details || [])];
		records.push({
			recordId: item.id || createRecordId("experience", item.slug || title),
			sourceType: "experience",
			title,
			slug: item.slug,
			url: item.url,
			tags: [...(item.tags || []), ...(item.tech || []), item.company, item.title].filter(
				Boolean,
			) as string[],
			priority: item.priority ?? 9,
			summary: [
				title,
				item.location,
				item.startDate && item.endDate
					? `${item.startDate} - ${item.endDate}`
					: item.startDate || item.endDate,
				item.summary,
			]
				.filter(Boolean)
				.join("\n"),
			sections: [
				{
					heading: "overview",
					content: [item.summary, details.join("\n")].filter(Boolean).join("\n\n"),
				},
				{
					heading: "technology",
					content: (item.tech || []).join(", "),
				},
			].filter((section) => section.content),
		});
	}

	for (const item of education) {
		const title = `${item.degree} — ${item.institute}`;
		records.push({
			recordId: item.id || createRecordId("education", item.slug || title),
			sourceType: "education",
			title,
			slug: item.slug,
			url: item.url,
			tags: [...(item.tags || []), item.degree, item.institute].filter(Boolean) as string[],
			priority: item.priority ?? 6,
			summary: [
				item.degree,
				item.institute,
				item.location,
				item.startDate && item.endDate
					? `${item.startDate} - ${item.endDate}`
					: item.startDate || item.endDate,
				item.summary,
			]
				.filter(Boolean)
				.join("\n"),
			sections: [
				{
					heading: "overview",
					content: [item.summary, ...(item.highlights || [])]
						.filter(Boolean)
						.join("\n"),
				},
			].filter((section) => section.content),
		});
	}

	for (const entry of entries) {
		const sourceType = normalizeSourceType(entry.sourceType);
		const title = entry.title;
		const body = toParagraphText(entry.body || entry.content);
		const sectionList =
			entry.sections?.map((section) => ({
				heading: section.heading,
				content: toParagraphText(section.content),
			})) || [];

		if (body && sectionList.length === 0) {
			sectionList.push({ heading: "body", content: body });
		}

		records.push({
			recordId: entry.id || createRecordId(sourceType, entry.slug || title),
			sourceType,
			title,
			slug: entry.slug,
			url: entry.url,
			tags: entry.tags || [],
			priority: entry.priority ?? 5,
			summary: [entry.summary || entry.excerpt, entry.date].filter(Boolean).join("\n"),
			sections: sectionList.filter((section) => section.content),
		});
	}

	if (records.length === 0) {
		throw new Error("The dataset did not produce any records to ingest.");
	}

	return { records } satisfies NormalizedDataset;
}
