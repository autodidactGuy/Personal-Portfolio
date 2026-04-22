type ApiClientOptions = {
	accountId: string;
	apiToken: string;
};

type EmbeddingRequest = {
	model: string;
	texts: string[];
};

type VectorizeVector = {
	id: string;
	values: number[];
	metadata: Record<string, unknown>;
};

type KvPair = {
	key: string;
	value: string;
};

export class CloudflareApiClient {
	constructor(private readonly options: ApiClientOptions) {}

	private async request(path: string, init: RequestInit) {
		const response = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${this.options.accountId}${path}`,
			{
				...init,
				headers: {
					Authorization: `Bearer ${this.options.apiToken}`,
					...(init.headers || {}),
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Cloudflare API request failed: ${response.status} ${response.statusText}`);
		}

		const payload = (await response.json()) as {
			success?: boolean;
			result?: unknown;
			errors?: Array<{ message?: string }>;
		};

		if (payload.success === false) {
			const errorMessage =
				payload.errors?.map((item) => item.message).filter(Boolean).join("; ") ||
				"Unknown Cloudflare API error";
			throw new Error(errorMessage);
		}

		return payload.result;
	}

	async createEmbeddings(request: EmbeddingRequest) {
		const result = (await this.request(`/ai/run/${request.model}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				text: request.texts,
				pooling: "cls",
			}),
		})) as {
			data?: number[][];
		};

		if (!Array.isArray(result?.data)) {
			throw new Error("Workers AI embeddings response did not include vectors.");
		}

		return result.data;
	}

	async upsertVectors(indexName: string, vectors: VectorizeVector[]) {
		const body = vectors
			.map((vector) =>
				JSON.stringify({
					id: vector.id,
					values: vector.values,
					metadata: vector.metadata,
				}),
			)
			.join("\n");

		return this.request(`/vectorize/v2/indexes/${indexName}/upsert`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-ndjson",
			},
			body,
		});
	}

	async bulkWriteKv(namespaceId: string, pairs: KvPair[]) {
		return this.request(`/storage/kv/namespaces/${namespaceId}/bulk`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(
				pairs.map((pair) => ({
					key: pair.key,
					value: pair.value,
				})),
			),
		});
	}
}
