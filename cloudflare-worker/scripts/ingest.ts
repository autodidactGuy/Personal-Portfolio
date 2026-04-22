import process from "node:process";
import { z } from "zod";
import { buildChunks } from "./lib/chunking";
import { CloudflareApiClient } from "./lib/cloudflare-api";
import { loadDataset } from "./lib/dataset";

const ingestOptionsSchema = z.object({
	datasetPath: z.string().trim().min(1),
	accountId: z.string().trim().min(1),
	apiToken: z.string().trim().min(1),
	vectorIndex: z.string().trim().min(1),
	kvNamespaceId: z.string().trim().min(1),
	embedModel: z.string().trim().min(1).default("@cf/baai/bge-small-en-v1.5"),
	embeddingBatchSize: z.coerce.number().int().positive().max(96).default(32),
	kvBatchSize: z.coerce.number().int().positive().max(10000).default(500),
	vectorBatchSize: z.coerce.number().int().positive().max(1000).default(200),
	targetChars: z.coerce.number().int().positive().default(900),
	maxChars: z.coerce.number().int().positive().default(1200),
	overlapChars: z.coerce.number().int().nonnegative().default(120),
});

function readOptions() {
	const [datasetPathArg] = process.argv.slice(2);

	return ingestOptionsSchema.parse({
		datasetPath: datasetPathArg || process.env.RAG_DATASET_PATH,
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
		apiToken: process.env.CLOUDFLARE_API_TOKEN,
		vectorIndex: process.env.CLOUDFLARE_VECTORIZE_INDEX,
		kvNamespaceId: process.env.CLOUDFLARE_KV_NAMESPACE_ID,
		embedModel: process.env.RAG_EMBED_MODEL,
		embeddingBatchSize: process.env.RAG_EMBED_BATCH_SIZE,
		kvBatchSize: process.env.RAG_KV_BATCH_SIZE,
		vectorBatchSize: process.env.RAG_VECTOR_BATCH_SIZE,
		targetChars: process.env.RAG_CHUNK_TARGET_CHARS,
		maxChars: process.env.RAG_CHUNK_MAX_CHARS,
		overlapChars: process.env.RAG_CHUNK_OVERLAP_CHARS,
	});
}

function chunkArray<T>(items: T[], size: number) {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
}

async function main() {
	const options = readOptions();
	const dataset = await loadDataset(options.datasetPath);
	const chunks = buildChunks(dataset, {
		targetChars: options.targetChars,
		maxChars: options.maxChars,
		overlapChars: options.overlapChars,
	});

	console.log(`Loaded ${dataset.records.length} records and produced ${chunks.length} chunks.`);

	const client = new CloudflareApiClient({
		accountId: options.accountId,
		apiToken: options.apiToken,
	});

	const chunkBatches = chunkArray(chunks, options.embeddingBatchSize);
	for (let batchIndex = 0; batchIndex < chunkBatches.length; batchIndex += 1) {
		const chunkBatch = chunkBatches[batchIndex];
		const embeddings = await client.createEmbeddings({
			model: options.embedModel,
			texts: chunkBatch.map((chunk) => chunk.text),
		});

		const vectors = chunkBatch.map((chunk, index) => ({
			id: chunk.vectorId,
			values: embeddings[index],
			metadata: {
				chunkId: chunk.id,
				sourceType: chunk.sourceType,
				title: chunk.title,
				section: chunk.section,
				slug: chunk.slug || "",
				url: chunk.url || "",
				priority: chunk.priority,
			},
		}));

		for (const vectorBatch of chunkArray(vectors, options.vectorBatchSize)) {
			await client.upsertVectors(options.vectorIndex, vectorBatch);
		}

		for (const kvBatch of chunkArray(
			chunkBatch.map((chunk) => ({
				key: chunk.vectorId,
				value: JSON.stringify(chunk),
			})),
			options.kvBatchSize,
		)) {
			await client.bulkWriteKv(options.kvNamespaceId, kvBatch);
		}

		console.log(
			`Embedded and uploaded batch ${batchIndex + 1}/${Math.ceil(chunks.length / options.embeddingBatchSize)}.`,
		);
	}

	console.log("RAG ingestion complete.");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
