import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

type ResumeLink = {
	label?: string;
	href?: string;
	external?: boolean;
};

type ResumePayload = {
	name?: string;
	title?: string;
	headline?: string;
	summary?: string;
	hero?: {
		eyebrow?: string;
		headline?: string;
		highlightedText?: string;
		supportingText?: string;
		primaryCta?: ResumeLink;
		secondaryCta?: ResumeLink;
	};
	about?: {
		label?: string;
		title?: string;
		description?: string;
		headline?: string;
		summary?: string;
		industries?: string[];
		body?: string[];
	};
	featuredFocus?: {
		sectionLabel?: string;
		title?: string;
		summary?: string;
		pillars?: string[];
		cta?: ResumeLink;
	};
	homeStats?: {
		title?: string;
		badgeLabel?: string;
		items?: Array<{
			label?: string;
			value?: string;
		}>;
	};
	interests?: string[];
	industries?: string[];
	skills?: string[];
	links?: Record<string, string>;
	contact?: {
		title?: string;
		description?: string;
		formHeading?: string;
		scheduleHeading?: string;
		quickLink?: ResumeLink;
	};
	recommendations?: {
		title?: string;
		items?: Array<{
			name?: string;
			role?: string;
			relationship?: string;
			quote?: string;
			highlight?: string;
			featured?: boolean;
			linkedin?: string;
			cta?: string;
		}>;
	};
	experience?: Array<{
		title?: string;
		company?: string;
		companyComments?: string;
		location?: string;
		from?: string;
		to?: string;
		highlight?: string;
		details?: string[];
		tech?: string[];
	}>;
	education?: Array<{
		degree?: string;
		institute?: string;
		location?: string;
		from?: string;
		to?: string;
		result?: string;
	}>;
	projects?: ResumeCollectionItem[];
	articles?: ResumeCollectionItem[];
	caseStudies?: ResumeCollectionItem[];
};

type ResumeCollectionItem = {
	slug?: string;
	title?: string;
	summary?: string;
	tags?: string[];
	featured?: boolean;
	contentType?: string;
	excerpt?: string;
	url?: string;
	date?: string;
};

type RagEntry = {
	sourceType: string;
	title: string;
	slug: string;
	url: string;
	summary?: string;
	date?: string;
	tags?: string[];
	priority?: number;
	sections?: Array<{
		heading: string;
		content: string;
	}>;
};

type DatasetOutput = {
	personal: {
		name: string;
		title?: string;
		headline?: string;
		summary?: string;
		bio?: string[];
		skills?: string[];
		tags?: string[];
		links?: Record<string, string>;
	};
	experience: Array<Record<string, unknown>>;
	education: Array<Record<string, unknown>>;
	entries: RagEntry[];
};

const repoRoot = path.resolve(process.cwd(), "..");
const generatedDir = path.join(process.cwd(), ".generated");
const outputPath = path.join(generatedDir, "portfolio-rag.json");

function runResumeGenerate() {
	const result = spawnSync("yarn", ["resume:generate"], {
		cwd: repoRoot,
		stdio: "inherit",
	});

	if (result.status !== 0) {
		throw new Error(
			"Failed to refresh public/api/resume.json before building the RAG dataset.",
		);
	}
}

async function readJsonFile<T>(filePath: string) {
	const raw = await fs.readFile(filePath, "utf8");
	return JSON.parse(raw) as T;
}

function stripMarkdownNoise(content: string) {
	return content
		.replace(/```[\s\S]*?```/g, "")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/^>\s?/gm, "")
		.replace(/^\s*[-*+]\s+/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function splitMarkdownSections(markdown: string) {
	const cleaned = stripMarkdownNoise(markdown);
	const lines = cleaned.split("\n");
	const sections: Array<{ heading: string; content: string }> = [];
	let currentHeading = "Overview";
	let currentLines: string[] = [];

	const pushCurrent = () => {
		const content = currentLines.join("\n").trim();
		if (!content) {
			return;
		}

		sections.push({
			heading: currentHeading,
			content,
		});
		currentLines = [];
	};

	for (const line of lines) {
		const headingMatch = line.match(/^##+\s+(.*)$/);
		if (headingMatch) {
			pushCurrent();
			currentHeading = headingMatch[1].trim();
			continue;
		}

		currentLines.push(line);
	}

	pushCurrent();
	return sections;
}

function slugify(value: string) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function slugFromFileName(fileName: string) {
	return fileName.replace(/\.mdx$/, "");
}

function normalizeContentType(rawType?: string) {
	const normalized = String(rawType || "article").trim().toLowerCase();

	if (
		normalized === "project" ||
		normalized === "case-study" ||
		normalized === "article"
	) {
		return normalized;
	}

	return normalized === "blog" ? "article" : "article";
}

function createEntry(input: {
	sourceType: string;
	title: string;
	slug?: string;
	url?: string;
	summary?: string;
	date?: string;
	tags?: string[];
	priority?: number;
	sections?: Array<{ heading: string; content: string }>;
}) {
	const sections = (input.sections || []).filter(
		(section) => section.content && section.content.trim(),
	);

	if (!input.title.trim() || (!input.summary?.trim() && sections.length === 0)) {
		return null;
	}

	return {
		sourceType: input.sourceType,
		title: input.title.trim(),
		slug:
			input.slug && input.slug.trim()
				? input.slug.trim()
				: slugify(`${input.sourceType}-${input.title}`),
		url: input.url?.trim() || "https://hassanraza.us",
		summary: input.summary?.trim(),
		date: input.date?.trim(),
		tags: input.tags?.filter(Boolean) || [],
		priority: input.priority ?? 5,
		sections,
	} satisfies RagEntry;
}

function entrySectionsFromTextMap(
	values: Array<[string, string | undefined]>,
) {
	return values
		.filter(([, content]) => content && content.trim())
		.map(([heading, content]) => ({
			heading,
			content: String(content).trim(),
		}));
}

function resumeCollectionToEntries(
	label: "project" | "article" | "case-study",
	items: ResumeCollectionItem[] = [],
) {
	return items
		.map((item) =>
			createEntry({
				sourceType: label,
				title: item.title || item.slug || label,
				slug: item.slug,
				url:
					item.url ||
					`https://hassanraza.us/${
						label === "article" ? "blog" : "project"
					}/${item.slug || slugify(item.title || label)}`,
				summary: item.summary || item.excerpt,
				date: item.date,
				tags: item.tags || [],
				priority: item.featured ? 8 : 5,
				sections: entrySectionsFromTextMap([
					["summary", item.summary],
					["excerpt", item.excerpt],
					["contentType", item.contentType],
				]),
			}),
		)
		.filter(Boolean) as RagEntry[];
}

async function buildEntriesFromPosts() {
	const postsDir = path.join(repoRoot, "content", "posts");
	const fileNames = (await fs.readdir(postsDir)).filter((fileName) =>
		fileName.endsWith(".mdx"),
	);
	const entries: RagEntry[] = [];

	for (const fileName of fileNames) {
		const slug = slugFromFileName(fileName);
		const source = await fs.readFile(path.join(postsDir, fileName), "utf8");
		const { data, content } = matter(source);

		if (data.published === false) {
			continue;
		}

		const sourceType = normalizeContentType(data.contentType);
		const hrefPrefix = sourceType === "article" ? "/blog" : "/project";
		const entry = createEntry({
			sourceType,
			title: String(data.title || slug),
			slug,
			url: `https://hassanraza.us${hrefPrefix}/${slug}`,
			summary: typeof data.summary === "string" ? data.summary : undefined,
			date: typeof data.date === "string" ? data.date : undefined,
			tags: Array.isArray(data.tags)
				? data.tags.filter((tag): tag is string => typeof tag === "string")
				: [],
			priority: data.featured ? 8 : 5,
			sections: splitMarkdownSections(content),
		});

		if (entry) {
			entries.push(entry);
		}
	}

	return entries;
}

function buildResumeEntries(resume: ResumePayload) {
	const entries: RagEntry[] = [];

	const heroEntry = createEntry({
		sourceType: "hero",
		title: `${resume.name || "Hassan Raza"} hero`,
		slug: "hero",
		url: "https://hassanraza.us/",
		summary: resume.hero?.headline || resume.headline || resume.summary,
		tags: [
			"hero",
			...(resume.skills || []),
			...(resume.interests || []),
			...(resume.industries || []),
		],
		priority: 10,
		sections: entrySectionsFromTextMap([
			["eyebrow", resume.hero?.eyebrow],
			["headline", resume.hero?.headline],
			["highlightedText", resume.hero?.highlightedText],
			["supportingText", resume.hero?.supportingText],
			[
				"primaryCta",
				resume.hero?.primaryCta?.label && resume.hero?.primaryCta?.href
					? `${resume.hero.primaryCta.label}: ${resume.hero.primaryCta.href}`
					: undefined,
			],
			[
				"secondaryCta",
				resume.hero?.secondaryCta?.label && resume.hero?.secondaryCta?.href
					? `${resume.hero.secondaryCta.label}: ${resume.hero.secondaryCta.href}`
					: undefined,
			],
		]),
	});
	if (heroEntry) {
		entries.push(heroEntry);
	}

	const aboutEntry = createEntry({
		sourceType: "about",
		title: resume.about?.title || `${resume.name || "Hassan Raza"} about`,
		slug: "about",
		url: "https://hassanraza.us/about",
		summary: resume.about?.summary || resume.about?.description || resume.summary,
		tags: ["about", ...(resume.interests || []), ...(resume.industries || [])],
		priority: 10,
		sections: [
			...entrySectionsFromTextMap([
				["label", resume.about?.label],
				["headline", resume.about?.headline],
				["description", resume.about?.description],
				["industries", (resume.about?.industries || []).join(", ")],
			]),
			...(resume.about?.body || []).map((paragraph, index) => ({
				heading: `body-${index + 1}`,
				content: paragraph,
			})),
		],
	});
	if (aboutEntry) {
		entries.push(aboutEntry);
	}

	const focusEntry = createEntry({
		sourceType: "focus",
		title:
			resume.featuredFocus?.title ||
			`${resume.name || "Hassan Raza"} featured focus`,
		slug: "featured-focus",
		url: "https://hassanraza.us/",
		summary: resume.featuredFocus?.summary,
		tags: ["focus", ...(resume.interests || []), ...(resume.industries || [])],
		priority: 8,
		sections: [
			...entrySectionsFromTextMap([
				["sectionLabel", resume.featuredFocus?.sectionLabel],
				["summary", resume.featuredFocus?.summary],
				[
					"cta",
					resume.featuredFocus?.cta?.label && resume.featuredFocus?.cta?.href
						? `${resume.featuredFocus.cta.label}: ${resume.featuredFocus.cta.href}`
						: undefined,
				],
			]),
			...(resume.featuredFocus?.pillars || []).map((pillar, index) => ({
				heading: `pillar-${index + 1}`,
				content: pillar,
			})),
		],
	});
	if (focusEntry) {
		entries.push(focusEntry);
	}

	const statsEntry = createEntry({
		sourceType: "stats",
		title:
			resume.homeStats?.title || `${resume.name || "Hassan Raza"} stats snapshot`,
		slug: "home-stats",
		url: "https://hassanraza.us/",
		summary: resume.homeStats?.badgeLabel,
		tags: ["stats", "metrics"],
		priority: 7,
		sections: [
			...entrySectionsFromTextMap([
				["badgeLabel", resume.homeStats?.badgeLabel],
			]),
			...(resume.homeStats?.items || [])
				.filter((item) => item.label && item.value)
				.map((item, index) => ({
					heading: `stat-${index + 1}`,
					content: `${item.label}: ${item.value}`,
				})),
		],
	});
	if (statsEntry) {
		entries.push(statsEntry);
	}

	const interestsEntry = createEntry({
		sourceType: "interest",
		title: `${resume.name || "Hassan Raza"} interests`,
		slug: "interests",
		url: "https://hassanraza.us/about",
		summary: (resume.interests || []).join(", "),
		tags: ["interests", ...(resume.interests || [])],
		priority: 6,
		sections: (resume.interests || []).map((interest, index) => ({
			heading: `interest-${index + 1}`,
			content: interest,
		})),
	});
	if (interestsEntry) {
		entries.push(interestsEntry);
	}

	const industriesEntry = createEntry({
		sourceType: "about",
		title: `${resume.name || "Hassan Raza"} industries`,
		slug: "industries",
		url: "https://hassanraza.us/resume",
		summary: (resume.industries || []).join(", "),
		tags: ["industries", ...(resume.industries || [])],
		priority: 7,
		sections: (resume.industries || []).map((industry, index) => ({
			heading: `industry-${index + 1}`,
			content: industry,
		})),
	});
	if (industriesEntry) {
		entries.push(industriesEntry);
	}

	const skillsEntry = createEntry({
		sourceType: "skill",
		title: `${resume.name || "Hassan Raza"} skills`,
		slug: "skills",
		url: "https://hassanraza.us/about",
		summary: (resume.skills || []).slice(0, 12).join(", "),
		tags: ["skills", ...(resume.skills || [])],
		priority: 8,
		sections: (resume.skills || []).map((skill, index) => ({
			heading: `skill-${index + 1}`,
			content: skill,
		})),
	});
	if (skillsEntry) {
		entries.push(skillsEntry);
	}

	const linksEntry = createEntry({
		sourceType: "link",
		title: `${resume.name || "Hassan Raza"} links`,
		slug: "links",
		url: "https://hassanraza.us/contact",
		summary: Object.keys(resume.links || {}).join(", "),
		tags: ["links", "contact"],
		priority: 7,
		sections: Object.entries(resume.links || {}).map(([label, href]) => ({
			heading: label,
			content: `${label}: ${href}`,
		})),
	});
	if (linksEntry) {
		entries.push(linksEntry);
	}

	const contactEntry = createEntry({
		sourceType: "contact",
		title: resume.contact?.title || `${resume.name || "Hassan Raza"} contact`,
		slug: "contact",
		url: "https://hassanraza.us/contact",
		summary: resume.contact?.description,
		tags: ["contact"],
		priority: 7,
		sections: entrySectionsFromTextMap([
			["description", resume.contact?.description],
			["formHeading", resume.contact?.formHeading],
			["scheduleHeading", resume.contact?.scheduleHeading],
			[
				"quickLink",
				resume.contact?.quickLink?.label && resume.contact?.quickLink?.href
					? `${resume.contact.quickLink.label}: ${resume.contact.quickLink.href}`
					: undefined,
			],
		]),
	});
	if (contactEntry) {
		entries.push(contactEntry);
	}

	const recommendationItems = resume.recommendations?.items || [];
	for (let index = 0; index < recommendationItems.length; index += 1) {
		const item = recommendationItems[index];
		const recommendationEntry = createEntry({
			sourceType: "recommendation",
			title: item.name || `Recommendation ${index + 1}`,
			slug: `recommendation-${slugify(item.name || String(index + 1))}`,
			url: item.linkedin || item.cta || "https://hassanraza.us/recommendations",
			summary: item.highlight || item.role,
			tags: [
				"recommendation",
				item.name || "",
				item.role || "",
				item.relationship || "",
			].filter(Boolean),
			priority: item.featured ? 8 : 5,
			sections: entrySectionsFromTextMap([
				["role", item.role],
				["relationship", item.relationship],
				["highlight", item.highlight],
				["quote", item.quote],
				["linkedin", item.linkedin],
				["cta", item.cta],
			]),
		});

		if (recommendationEntry) {
			entries.push(recommendationEntry);
		}
	}

	return entries;
}

async function main() {
	runResumeGenerate();

	const resume = await readJsonFile<ResumePayload>(
		path.join(repoRoot, "public", "api", "resume.json"),
	);
	const postEntries = await buildEntriesFromPosts();
	const resumeEntries = buildResumeEntries(resume);
	const structuredEntries = [
		...resumeCollectionToEntries("project", resume.projects),
		...resumeCollectionToEntries("article", resume.articles),
		...resumeCollectionToEntries("case-study", resume.caseStudies),
	];

	const dedupedPostMap = new Map(postEntries.map((entry) => [entry.slug, entry]));
	for (const entry of structuredEntries) {
		if (!dedupedPostMap.has(entry.slug)) {
			dedupedPostMap.set(entry.slug, entry);
		}
	}
	const dedupedEntries = Array.from(dedupedPostMap.values());

	const experience = (resume.experience || []).map((item, index) => ({
		id: `experience-${index + 1}`,
		title: item.title || "Unknown role",
		company: item.company || "Unknown company",
		location: item.location,
		startDate: item.from,
		endDate: item.to,
		summary: item.highlight,
		details: [
			...(item.companyComments ? [item.companyComments] : []),
			...(item.details || []),
		],
		tech: item.tech || [],
		priority: index === 0 ? 10 : 9,
	}));

	const education = (resume.education || []).map((item, index) => ({
		id: `education-${index + 1}`,
		degree: item.degree || "Unknown degree",
		institute: item.institute || "Unknown institute",
		location: item.location,
		startDate: item.from,
		endDate: item.to,
		summary: item.result,
		priority: 6,
	}));

	const dataset = {
		personal: {
			name: resume.name || "Hassan Raza",
			title: resume.title,
			headline: resume.headline,
			summary: resume.summary,
			bio: resume.about?.body || [],
			skills: resume.skills || [],
			tags: [
				...(resume.interests || []),
				...(resume.industries || []),
				...(resume.skills || []),
			],
			links: resume.links || {},
		},
		experience,
		education,
		entries: [...resumeEntries, ...dedupedEntries],
	} satisfies DatasetOutput;

	await fs.mkdir(generatedDir, { recursive: true });
	await fs.writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

	console.log(`Built RAG dataset at ${outputPath}`);
	console.log(
		`Included ${dataset.experience.length} experience items, ${dataset.education.length} education items, and ${dataset.entries.length} content entries.`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
