import { createCanonicalChunkId, createVectorId } from "./ids";
import type { NormalizedDataset, NormalizedRecord } from "./dataset";

export type ChunkingOptions = {
	targetChars: number;
	maxChars: number;
	overlapChars: number;
};

export type RagChunk = {
	vectorId: string;
	id: string;
	text: string;
	sourceType: string;
	title: string;
	url?: string;
	slug?: string;
	tags: string[];
	section: string;
	priority: number;
};

function cleanText(value: string) {
	return value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function splitParagraphs(text: string) {
	return cleanText(text)
		.split(/\n\s*\n/g)
		.map((part) => part.trim())
		.filter(Boolean);
}

function sliceLongParagraph(paragraph: string, maxChars: number, overlapChars: number) {
	if (paragraph.length <= maxChars) {
		return [paragraph];
	}

	const slices: string[] = [];
	let start = 0;

	while (start < paragraph.length) {
		const end = Math.min(paragraph.length, start + maxChars);
		slices.push(paragraph.slice(start, end).trim());

		if (end >= paragraph.length) {
			break;
		}

		start = Math.max(end - overlapChars, start + 1);
	}

	return slices.filter(Boolean);
}

function groupParagraphs(
	paragraphs: string[],
	options: ChunkingOptions,
): Array<{ heading: string; text: string }> {
	const groups: Array<{ heading: string; text: string }> = [];
	let current = "";

	for (const paragraph of paragraphs.flatMap((part) =>
		sliceLongParagraph(part, options.maxChars, options.overlapChars),
	)) {
		if (!current) {
			current = paragraph;
			continue;
		}

		const candidate = `${current}\n\n${paragraph}`;
		if (candidate.length <= options.targetChars || current.length < options.maxChars * 0.7) {
			current = candidate;
			continue;
		}

		groups.push({ heading: "", text: cleanText(current) });
		current = paragraph;
	}

	if (current) {
		groups.push({ heading: "", text: cleanText(current) });
	}

	return groups;
}

function createSummaryText(record: NormalizedRecord) {
	const summaryBits = [record.summary, ...record.sections.slice(0, 1).map((section) => section.content)]
		.filter(Boolean)
		.join("\n\n");

	return cleanText(summaryBits);
}

function recordToChunks(record: NormalizedRecord, options: ChunkingOptions) {
	const chunks: RagChunk[] = [];
	let chunkIndex = 0;

	const summaryText = createSummaryText(record);
	if (summaryText) {
		const id = createCanonicalChunkId({
			sourceType: record.sourceType,
			slug: record.slug || record.recordId,
			title: record.title,
			section: "summary",
			chunkIndex,
		});
		chunks.push({
			vectorId: createVectorId(id),
			id,
			text: summaryText,
			sourceType: record.sourceType,
			title: record.title,
			url: record.url,
			slug: record.slug,
			tags: record.tags,
			section: "summary",
			priority: Math.max(record.priority, 1),
		});
		chunkIndex += 1;
	}

	for (const section of record.sections) {
		const paragraphs = splitParagraphs(section.content);
		const groups = groupParagraphs(paragraphs, options);

		for (let sectionIndex = 0; sectionIndex < groups.length; sectionIndex += 1) {
			const group = groups[sectionIndex];
			const label = sectionIndex === 0 ? section.heading : `${section.heading}-${sectionIndex + 1}`;
			const id = createCanonicalChunkId({
				sourceType: record.sourceType,
				slug: record.slug || record.recordId,
				title: record.title,
				section: label,
				chunkIndex,
			});
			const headingPrefix = section.heading ? `${section.heading}\n` : "";

			chunks.push({
				vectorId: createVectorId(id),
				id,
				text: cleanText(`${record.title}\n${headingPrefix}${group.text}`),
				sourceType: record.sourceType,
				title: record.title,
				url: record.url,
				slug: record.slug,
				tags: record.tags,
				section: label,
				priority: record.priority,
			});
			chunkIndex += 1;
		}
	}

	return chunks;
}

export function buildChunks(dataset: NormalizedDataset, options: ChunkingOptions) {
	return dataset.records.flatMap((record) => recordToChunks(record, options));
}
