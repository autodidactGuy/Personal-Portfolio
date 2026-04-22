import { createHash } from "node:crypto";

function slugifyPart(value: string) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 32);
}

export function createCanonicalChunkId(input: {
	sourceType: string;
	slug?: string | null;
	title: string;
	section: string;
	chunkIndex: number;
}) {
	const sourceType = slugifyPart(input.sourceType) || "source";
	const slug = slugifyPart(input.slug || input.title) || "item";
	const section = slugifyPart(input.section) || "section";
	return `${sourceType}:${slug}:${section}:${input.chunkIndex}`;
}

export function createVectorId(canonicalId: string) {
	const digest = createHash("sha256").update(canonicalId).digest("hex").slice(0, 16);
	const prefix = canonicalId
		.split(":")
		.slice(0, 3)
		.map((part) => slugifyPart(part))
		.filter(Boolean)
		.join(":")
		.slice(0, 46);

	return `${prefix}:${digest}`.slice(0, 64);
}
