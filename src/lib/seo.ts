import { siteConfig, withBasePath } from "@/config/site";
import aboutProfileJson from "../../content/about/profile.json";
import homeHeroJson from "../../content/home/hero.json";

export type SeoEntry = {
	title?: string;
	fullTitle?: string;
	description?: string;
	pathname?: string;
	canonicalPathname?: string;
	image?: string;
	fallbackImage?: string;
	imageAlt?: string;
	type?: "website" | "article" | "profile";
	publishedTime?: string;
	tags?: string[];
	noindex?: boolean;
	structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const DEFAULT_SOCIAL_IMAGE = homeHeroJson.image || siteConfig.avatar;
const PERSON_IMAGE = aboutProfileJson.photo || siteConfig.avatar;
const PERSON_KNOWS_ABOUT = [
	"FinTech Infrastructure",
	"Distributed Systems",
	"AI Systems",
	"Payment Platforms",
	"Cloud Architecture",
	"Data Pipelines",
];

function trimSlash(value: string) {
	return value.replace(/\/+$/, "");
}

function ensureLeadingSlash(value: string) {
	return value.startsWith("/") ? value : `/${value}`;
}

export function getSiteOrigin() {
	return trimSlash(siteConfig.siteUrl);
}

export function getSiteUrl(pathname = "/") {
	const normalizedPath = pathname === "/" ? "/" : ensureLeadingSlash(pathname);
	return `${getSiteOrigin()}${normalizedPath}`;
}

export function getAbsoluteImageUrl(image?: string | null) {
	const source = image || DEFAULT_SOCIAL_IMAGE || siteConfig.avatar;

	if (!source) {
		return undefined;
	}

	if (/^https?:\/\//.test(source)) {
		return source;
	}

	return `${getSiteOrigin()}${withBasePath(source)}`;
}

export function getGeneratedPageOgImage(
	page:
		| "home"
		| "about"
		| "resume"
		| "blog"
		| "projects"
		| "recommendations"
		| "contact",
) {
	return `/og/${page}.png`;
}

export function getGeneratedPostOgImage(slug: string, isProject = false) {
	return isProject ? `/og/projects/${slug}.png` : `/og/posts/${slug}.png`;
}

export function getSeoImage(
	image?: string | null,
	fallbackImage?: string | null,
) {
	return image || fallbackImage || DEFAULT_SOCIAL_IMAGE || siteConfig.avatar;
}

export function buildTitle(title?: string) {
	if (!title) {
		return `${siteConfig.name} | ${siteConfig.title}`;
	}

	return `${title} | ${siteConfig.name}`;
}

export function getPersonId() {
	return `${getSiteOrigin()}/#person`;
}

export function getWebsiteId() {
	return `${getSiteOrigin()}/#website`;
}

export function buildSeo(entry: SeoEntry = {}) {
	const pathname = entry.pathname || "/";
	const description = entry.description || siteConfig.description;
	const image = getSeoImage(entry.image, entry.fallbackImage);

	return {
		title: entry.fullTitle || buildTitle(entry.title),
		description,
		pathname,
		canonical: getSiteUrl(entry.canonicalPathname || pathname),
		image,
		absoluteImage: getAbsoluteImageUrl(image),
		imageAlt:
			entry.imageAlt ||
			(entry.title
				? `${entry.title} - ${siteConfig.name}`
				: `${siteConfig.name} - ${siteConfig.title}`),
		type: entry.type || "website",
		publishedTime: entry.publishedTime,
		tags: entry.tags || [],
		noindex: entry.noindex || false,
		structuredData: entry.structuredData
			? Array.isArray(entry.structuredData)
				? entry.structuredData
				: [entry.structuredData]
			: [],
	};
}

export function formatIsoDate(date: string) {
	return new Date(date).toISOString();
}

export function getPersonStructuredData() {
	return {
		"@context": "https://schema.org",
		"@type": "Person",
		"@id": getPersonId(),
		name: siteConfig.name,
		url: getSiteUrl("/"),
		image: getAbsoluteImageUrl(PERSON_IMAGE),
		jobTitle: siteConfig.title,
		description: siteConfig.description,
		sameAs: [
			siteConfig.links.github,
			siteConfig.links.linkedin,
			siteConfig.links.twitter,
		].filter(Boolean),
		knowsAbout: PERSON_KNOWS_ABOUT,
	};
}

export function getWebsiteStructuredData() {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": getWebsiteId(),
		name: siteConfig.name,
		url: getSiteUrl("/"),
		description: siteConfig.description,
		publisher: {
			"@id": getPersonId(),
		},
	};
}
