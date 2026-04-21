import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import experimentalAssistantDefaults from "../config/experimental-assistant.defaults.json" with { type: "json" };

const projectRoot = process.cwd();
const contentRoot = path.join(projectRoot, "content");
const publicRoot = path.join(projectRoot, "public");
const outputDir = path.join(publicRoot, "experimental-assistant");
const outputPath = path.join(outputDir, "index.json");

const DEFAULT_EMBEDDING_MODEL =
	process.env.HF_EMBEDDING_MODEL ||
	experimentalAssistantDefaults.HF_EMBEDDING_MODEL;
const DEFAULT_PROXY_URL =
	process.env.EXPERIMENTAL_ASSISTANT_PROXY_URL ||
	experimentalAssistantDefaults.EXPERIMENTAL_ASSISTANT_PROXY_URL;
const ARTIFACT_VERSION = "v2";

function readJson(relativePath) {
	return JSON.parse(fs.readFileSync(path.join(contentRoot, relativePath), "utf8"));
}

function readPosts() {
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
		const normalized = String(item || "").trim();

		if (normalized && !values.includes(normalized)) {
			values.push(normalized);
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

function splitSentences(value) {
	return compactText(value)
		.split(/(?<=[.!?])\s+/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function splitParagraphs(value) {
	return String(value || "")
		.split(/\n{2,}/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function takeExcerpt(value, maxLength = 900) {
	const normalized = compactText(value);

	if (normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxLength).trim()}...`;
}

function tokenize(value) {
	return compactText(value)
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean);
}

function withLeadingSlash(value) {
	return value.startsWith("/") ? value : `/${value}`;
}

function getSiteUrl(siteSettings) {
	return String(siteSettings.siteUrl || "").replace(/\/+$/, "");
}

function getAbsoluteUrl(siteUrl, value) {
	if (!value) {
		return undefined;
	}

	if (/^https?:\/\//.test(value)) {
		return value;
	}

	return new URL(withLeadingSlash(value), siteUrl).toString();
}

function createChunk(input) {
	return {
		...input,
		keywords: uniqueOrdered(input.keywords || []),
		tags: uniqueOrdered(input.tags || []),
		entities: uniqueOrdered(input.entities || []),
		text: compactText(input.text),
	};
}

function pushChunk(chunks, input) {
	const chunk = createChunk(input);

	if (!chunk.text) {
		return;
	}

	chunks.push(chunk);
}

function buildChunkId(parts) {
	return parts
		.filter(Boolean)
		.join("-")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function inferTopicTags(value) {
	const normalized = compactText(value).toLowerCase();
	const tags = [];
	const topicMatchers = [
		["payments", /\b(payment|payments|donation|ach|card|cards|crypto|stock|fintech|adyen)\b/],
		["migration", /\b(migration|migrate|migrated|etl|ingestion|deduplication|records?)\b/],
		["ai", /\b(ai|llm|llms|prompt|prompts|model|evaluation|analytics|natural language)\b/],
		["architecture", /\b(architecture|architected|service boundaries|microservices|distributed systems|event driven)\b/],
		["reliability", /\b(reliability|observability|retries|retry|fault tolerant|monitoring|logging)\b/],
		["data", /\b(data|dataset|datasets|pipeline|pipelines|analytics|query|queries)\b/],
		["cloud", /\b(aws|ecs|s3|lambda|dynamodb|ec2|kinesis|sqs|docker|cloudformation)\b/],
	];

	for (const [label, matcher] of topicMatchers) {
		if (matcher.test(normalized)) {
			tags.push(label);
		}
	}

	return tags;
}

function buildMetadata({ title, text, keywords = [], tags = [], entities = [] }) {
	return {
		tags: uniqueOrdered([
			...tags,
			...inferTopicTags(`${title} ${text} ${keywords.join(" ")}`),
		]),
		entities: uniqueOrdered([title, ...entities, ...keywords.slice(0, 8)]),
	};
}

function buildPostBlocks(content) {
	const paragraphs = splitParagraphs(content);
	const blocks = [];
	let currentHeading = "";

	for (const paragraph of paragraphs) {
		const normalizedParagraph = String(paragraph || "").trim();

		if (/^#{1,6}\s/.test(normalizedParagraph)) {
			currentHeading = compactText(normalizedParagraph.replace(/^#{1,6}\s*/, ""));
			continue;
		}

		blocks.push({
			heading: currentHeading,
			text: compactText(normalizedParagraph),
		});
	}

	if (!blocks.length) {
		const sentences = splitSentences(content);
		for (let index = 0; index < sentences.length; index += 2) {
			blocks.push({
				heading: "",
				text: sentences.slice(index, index + 2).join(" "),
			});
		}
	}

	return blocks.filter((block) => block.text);
}

function buildCorpus() {
	const site = readJson("settings/site.json");
	const hero = readJson("home/hero.json");
	const profile = readJson("about/profile.json");
	const featuredFocus = readJson("home/featured-focus.json");
	const stats = readJson("home/stats.json");
	const contact = readJson("settings/contact.json");
	const experience = readJson("about/experience.json").items;
	const education = readJson("about/education.json").items;
	const recommendations = readJson("recommendations/index.json").items;
	const posts = readPosts();
	const siteUrl = getSiteUrl(site);
	const chunks = [];

	pushChunk(chunks, {
			id: "summary-core",
			title: `${site.name} Summary`,
			category: "summary",
			section: "profile",
			text: `${site.name} is a ${site.title}. ${profile.headline}`,
			keywords: [
				site.name,
				site.title,
				"profile",
				"summary",
			],
			...buildMetadata({
				title: `${site.name} Summary`,
				text: `${site.name} is a ${site.title}. ${profile.headline}`,
				keywords: [site.name, site.title, "profile", "summary"],
				entities: [site.name, site.title],
			}),
			url: getAbsoluteUrl(siteUrl, "/about"),
		});

	pushChunk(chunks, {
		id: "summary-background",
		title: `${site.name} Background`,
		category: "summary",
		section: "profile",
		text: profile.summary,
		keywords: [
			site.name,
			"background",
			"distributed systems",
			"financial infrastructure",
			"ai platforms",
		],
		...buildMetadata({
			title: `${site.name} Background`,
			text: profile.summary,
			keywords: [
				site.name,
				"background",
				"distributed systems",
				"financial infrastructure",
				"ai platforms",
			],
			entities: [site.name],
		}),
		url: getAbsoluteUrl(siteUrl, "/about"),
	});

	pushChunk(chunks, {
		id: "summary-focus",
		title: "Current Focus",
		category: "summary",
		section: "profile",
		text: featuredFocus.summary || hero.supportingText,
		keywords: [
			"focus",
			"payments",
			"data",
			"ai",
			...(featuredFocus.pillars || []),
		],
		...buildMetadata({
			title: "Current Focus",
			text: featuredFocus.summary || hero.supportingText,
			keywords: ["focus", "payments", "data", "ai", ...(featuredFocus.pillars || [])],
		}),
		url: getAbsoluteUrl(siteUrl, "/"),
	});

	(stats.items || []).forEach((item, index) => {
		pushChunk(chunks, {
			id: `stat-${index + 1}-${item.label}`,
			title: item.label,
			category: "summary",
			section: "stats",
			text: `${item.label}: ${item.value}.`,
			keywords: [item.label, item.value, "stats", "scale"],
			...buildMetadata({
				title: item.label,
				text: `${item.label}: ${item.value}.`,
				keywords: [item.label, item.value, "stats", "scale"],
			}),
			url: getAbsoluteUrl(siteUrl, "/"),
		});
	});

	(profile.body || []).forEach((paragraph, index) => {
		pushChunk(chunks, {
			id: `about-${index + 1}`,
			title: `${profile.aboutSectionTitle} ${index + 1}`,
			category: "about",
			section: "about",
			text: paragraph,
			keywords: tokenize(`${profile.headline} ${profile.summary} ${paragraph}`).slice(
				0,
				24,
			),
			...buildMetadata({
				title: `${profile.aboutSectionTitle} ${index + 1}`,
				text: paragraph,
				keywords: tokenize(`${profile.headline} ${profile.summary} ${paragraph}`).slice(
					0,
					24,
				),
				entities: [site.name],
			}),
			url: getAbsoluteUrl(siteUrl, "/about"),
		});
	});

	experience.forEach((item, index) => {
		const roleId = buildChunkId([
			"experience",
			index + 1,
			item.company,
			item.title,
		]);
		const sharedExperienceFields = {
			category: "experience",
			section: "experience",
			from: item.from,
			to: item.to,
			isCurrent: String(item.to || "").toLowerCase() === "present",
			url: getAbsoluteUrl(siteUrl, "/about"),
		};

		pushChunk(chunks, {
			id: `${roleId}-overview`,
			title: `${item.title} at ${item.company}`,
			...sharedExperienceFields,
			text: [
				`${item.title} at ${item.company}.`,
				item.companyComments || "",
				`${item.from} to ${item.to} in ${item.location}.`,
				item.highlight,
			].join(" "),
			keywords: uniqueOrdered([
				item.title,
				item.company,
				item.location,
				...tokenize(item.highlight),
			]),
			...buildMetadata({
				title: `${item.title} at ${item.company}`,
				text: [
					`${item.title} at ${item.company}.`,
					item.companyComments || "",
					`${item.from} to ${item.to} in ${item.location}.`,
					item.highlight,
				].join(" "),
				keywords: uniqueOrdered([
					item.title,
					item.company,
					item.location,
					...tokenize(item.highlight),
				]),
				entities: [item.company, item.title, item.location],
			}),
		});

		(item.details || []).forEach((detail, detailIndex) => {
			pushChunk(chunks, {
				id: `${roleId}-detail-${detailIndex + 1}`,
				title: `${item.company} Detail ${detailIndex + 1}`,
				...sharedExperienceFields,
				text: detail,
				keywords: uniqueOrdered([
					item.title,
					item.company,
					...tokenize(detail).slice(0, 18),
				]),
				...buildMetadata({
					title: `${item.company} Detail ${detailIndex + 1}`,
					text: detail,
					keywords: uniqueOrdered([
						item.title,
						item.company,
						...tokenize(detail).slice(0, 18),
					]),
					entities: [item.company, item.title],
				}),
			});
		});

		if ((item.tech || []).length) {
			pushChunk(chunks, {
				id: `${roleId}-tech`,
				title: `${item.company} Tech Stack`,
				...sharedExperienceFields,
				text: `Tech used in ${item.title} at ${item.company}: ${item.tech.join(", ")}.`,
				keywords: uniqueOrdered([
					item.title,
					item.company,
					...item.tech,
					"tech stack",
				]),
				...buildMetadata({
					title: `${item.company} Tech Stack`,
					text: `Tech used in ${item.title} at ${item.company}: ${item.tech.join(", ")}.`,
					keywords: uniqueOrdered([
						item.title,
						item.company,
						...item.tech,
						"tech stack",
					]),
					tags: ["tech"],
					entities: [item.company, item.title, ...item.tech],
				}),
			});
		}
	});

	education.forEach((item, index) => {
		const educationId = buildChunkId([
			"education",
			index + 1,
			item.institute,
			item.degree,
		]);

		pushChunk(chunks, {
			id: `${educationId}-overview`,
			title: `${item.degree} at ${item.institute}`,
			category: "education",
			section: "education",
			text: [
				item.degree,
				item.institute,
				item.location,
				`${item.from} to ${item.to}.`,
			].join(" "),
			keywords: uniqueOrdered([item.degree, item.institute, item.location]),
			...buildMetadata({
				title: `${item.degree} at ${item.institute}`,
				text: [
					item.degree,
					item.institute,
					item.location,
					`${item.from} to ${item.to}.`,
				].join(" "),
				keywords: uniqueOrdered([item.degree, item.institute, item.location]),
				entities: [item.degree, item.institute, item.location],
			}),
			from: item.from,
			to: item.to,
			url: getAbsoluteUrl(siteUrl, "/about"),
		});

		if (item.result) {
			pushChunk(chunks, {
				id: `${educationId}-result`,
				title: `${item.institute} Result`,
				category: "education",
				section: "education",
				text: item.result,
				keywords: uniqueOrdered([item.degree, item.institute, item.result]),
				...buildMetadata({
					title: `${item.institute} Result`,
					text: item.result,
					keywords: uniqueOrdered([item.degree, item.institute, item.result]),
					entities: [item.degree, item.institute],
				}),
				from: item.from,
				to: item.to,
				url: getAbsoluteUrl(siteUrl, "/about"),
			});
		}
	});

	posts.forEach((entry) => {
		const contentType = entry.frontmatter?.contentType || "article";
		const category =
			contentType === "project"
				? "project"
				: contentType === "case-study"
					? "case-study"
					: "article";
		const url =
			category === "article"
				? getAbsoluteUrl(siteUrl, `/blog/${entry.slug}`)
				: getAbsoluteUrl(siteUrl, `/project/${entry.slug}`);

		const postId = buildChunkId([contentType, entry.slug]);
		const sharedPostFields = {
			category,
			section: "posts",
			date: entry.frontmatter?.date || undefined,
			url,
		};

		pushChunk(chunks, {
			id: `${postId}-summary`,
			title: entry.frontmatter?.title || entry.slug,
			...sharedPostFields,
			text: [
				entry.frontmatter?.summary || "",
				(entry.frontmatter?.tags || []).length
					? `Tags: ${entry.frontmatter.tags.join(", ")}.`
					: "",
			].join(" "),
			keywords: uniqueOrdered([
				entry.frontmatter?.title,
				...(entry.frontmatter?.tags || []),
				contentType,
			]),
			...buildMetadata({
				title: entry.frontmatter?.title || entry.slug,
				text: [
					entry.frontmatter?.summary || "",
					(entry.frontmatter?.tags || []).length
						? `Tags: ${entry.frontmatter.tags.join(", ")}.`
						: "",
				].join(" "),
				keywords: uniqueOrdered([
					entry.frontmatter?.title,
					...(entry.frontmatter?.tags || []),
					contentType,
				]),
				entities: [entry.frontmatter?.title || entry.slug, entry.slug],
			}),
		});

		buildPostBlocks(entry.content)
			.slice(0, 8)
			.forEach((block, blockIndex) => {
				pushChunk(chunks, {
					id: `${postId}-block-${blockIndex + 1}`,
					title: block.heading
						? `${entry.frontmatter?.title || entry.slug} - ${block.heading}`
						: `${entry.frontmatter?.title || entry.slug} - Section ${blockIndex + 1}`,
					...sharedPostFields,
					text: takeExcerpt(block.text, 420),
					keywords: uniqueOrdered([
						entry.frontmatter?.title,
						...(entry.frontmatter?.tags || []),
						block.heading,
						...tokenize(block.text).slice(0, 18),
					]),
					...buildMetadata({
						title: block.heading
							? `${entry.frontmatter?.title || entry.slug} - ${block.heading}`
							: `${entry.frontmatter?.title || entry.slug} - Section ${blockIndex + 1}`,
						text: takeExcerpt(block.text, 420),
						keywords: uniqueOrdered([
							entry.frontmatter?.title,
							...(entry.frontmatter?.tags || []),
							block.heading,
							...tokenize(block.text).slice(0, 18),
						]),
						entities: [entry.frontmatter?.title || entry.slug, entry.slug, block.heading],
					}),
				});
			});
	});

	recommendations.forEach((item, index) => {
		const recommendationId = buildChunkId(["recommendation", index + 1, item.name]);
		const sharedRecommendationFields = {
			category: "recommendation",
			section: "recommendations",
			url: getAbsoluteUrl(siteUrl, "/recommendations"),
		};

		pushChunk(chunks, {
			id: `${recommendationId}-quote`,
			title: `Recommendation from ${item.name}`,
			...sharedRecommendationFields,
			text: item.quote,
			keywords: uniqueOrdered([
				item.name,
				item.role,
				item.relationship,
				"recommendation",
				"testimonial",
			]),
			...buildMetadata({
				title: `Recommendation from ${item.name}`,
				text: item.quote,
				keywords: uniqueOrdered([
					item.name,
					item.role,
					item.relationship,
					"recommendation",
					"testimonial",
				]),
				entities: [item.name, item.role],
			}),
		});

		if (item.highlight) {
			pushChunk(chunks, {
				id: `${recommendationId}-highlight`,
				title: `${item.name} Highlight`,
				...sharedRecommendationFields,
				text: item.highlight,
				keywords: uniqueOrdered([
					item.name,
					item.role,
					item.relationship,
					"highlight",
				]),
				...buildMetadata({
					title: `${item.name} Highlight`,
					text: item.highlight,
					keywords: uniqueOrdered([
						item.name,
						item.role,
						item.relationship,
						"highlight",
					]),
					entities: [item.name, item.role],
				}),
			});
		}
	});

	pushChunk(chunks, {
			id: "contact-paths",
			title: "Contact Options",
			category: "contact",
			section: "contact",
			text: [
				contact.title,
				contact.description,
				contact.formHeading,
				contact.scheduleHeading,
				site.navigation.headerQuickLink.label,
				site.links.calendly,
			].join(" "),
			keywords: [
				"contact",
				"email",
				"schedule",
				"calendly",
				"connect",
			],
			...buildMetadata({
				title: "Contact Options",
				text: [
					contact.title,
					contact.description,
					contact.formHeading,
					contact.scheduleHeading,
					site.navigation.headerQuickLink.label,
					site.links.calendly,
				].join(" "),
				keywords: ["contact", "email", "schedule", "calendly", "connect"],
				entities: [site.name, site.links.calendly],
			}),
			url: getAbsoluteUrl(siteUrl, "/contact"),
		});

	[
		["website", site.siteUrl],
		["github", site.links.github],
		["linkedin", site.links.linkedin],
		["resume", getAbsoluteUrl(siteUrl, site.links.resume)],
		["calendly", site.links.calendly],
	].forEach(([label, value]) => {
		pushChunk(chunks, {
			id: `important-link-${label}`,
			title: `${String(label).toUpperCase()} Link`,
			category: "links",
			section: "links",
			text: `${label}: ${value}.`,
			keywords: [label, "links", "contact"],
			...buildMetadata({
				title: `${String(label).toUpperCase()} Link`,
				text: `${label}: ${value}.`,
				keywords: [label, "links", "contact"],
				entities: [String(value)],
			}),
			url: getAbsoluteUrl(siteUrl, "/contact"),
		});
	});

	return chunks;
}

async function callProxyEmbeddings(proxyUrl, model, texts) {
	const response = await fetch(`${proxyUrl}/v1/embeddings`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model,
			input: texts,
		}),
	});

	if (!response.ok) {
		throw new Error(`Proxy embedding request failed: ${response.status}`);
	}

	const payload = await response.json();
	return (payload.data || []).map((item) => item.embedding || []);
}

async function callDirectEmbeddings(model, texts) {
	const hfToken = process.env.HF_TOKEN || experimentalAssistantDefaults.HF_TOKEN;

	if (!hfToken) {
		throw new Error(
			"HF_TOKEN is required when EXPERIMENTAL_ASSISTANT_PROXY_URL is not set.",
		);
	}

	const response = await fetch(
		`https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${hfToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				inputs: texts,
				options: {
					wait_for_model: true,
				},
			}),
		},
	);

	if (!response.ok) {
		throw new Error(`Direct embedding request failed: ${response.status}`);
	}

	const payload = await response.json();

	if (!Array.isArray(payload)) {
		throw new Error("Unexpected direct embedding payload.");
	}

	if (Array.isArray(payload[0]) && typeof payload[0][0] === "number") {
		return payload;
	}

	if (
		Array.isArray(payload[0]) &&
		Array.isArray(payload[0][0]) &&
		typeof payload[0][0][0] === "number"
	) {
		return payload.map((entry) => entry[0]);
	}

	return payload;
}

async function fetchEmbeddings(model, texts) {
	if (process.env.EXPERIMENTAL_ASSISTANT_PROXY_URL) {
		return callProxyEmbeddings(process.env.EXPERIMENTAL_ASSISTANT_PROXY_URL, model, texts);
	}

	try {
		return await callProxyEmbeddings(DEFAULT_PROXY_URL, model, texts);
	} catch {
		return callDirectEmbeddings(model, texts);
	}
}

async function buildArtifact() {
	const chunks = buildCorpus();
	const embeddings = await fetchEmbeddings(
		DEFAULT_EMBEDDING_MODEL,
		chunks.map((chunk) => `${chunk.title}\n${chunk.text}`),
	);

	if (embeddings.length !== chunks.length) {
		throw new Error(
			`Expected ${chunks.length} embeddings but received ${embeddings.length}.`,
		);
	}

	const sourceHash = crypto
		.createHash("sha256")
		.update(
			JSON.stringify({
				chunks,
				embeddingModel: DEFAULT_EMBEDDING_MODEL,
			}),
		)
		.digest("hex");

	return {
		version: ARTIFACT_VERSION,
		createdAt: new Date().toISOString(),
		sourceHash,
		embeddingModel: DEFAULT_EMBEDDING_MODEL,
		chunks,
		embeddings,
	};
}

fs.mkdirSync(outputDir, { recursive: true });

const artifact = await buildArtifact();
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

console.log(
	`Wrote experimental assistant artifact with ${artifact.chunks.length} chunks to ${outputPath}`,
);
