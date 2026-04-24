import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type ApiClientOptions = {
	accountId: string;
	apiToken: string;
	maxRetries?: number;
	baseRetryDelayMs?: number;
};

type R2ClientOptions = {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
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

type R2Object = {
	key: string;
	value: string;
	contentType?: string;
};

export class CloudflareApiClient {
	constructor(private readonly options: ApiClientOptions) {}

	private async sleep(delayMs: number) {
		await new Promise((resolve) => {
			setTimeout(resolve, delayMs);
		});
	}

	private getRetryDelayMs(response: Response, attempt: number) {
		const retryAfterHeader = response.headers.get("Retry-After");

		if (retryAfterHeader) {
			const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
			if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
				return retryAfterSeconds * 1000;
			}

			const retryAfterDate = Date.parse(retryAfterHeader);
			if (Number.isFinite(retryAfterDate)) {
				return Math.max(0, retryAfterDate - Date.now());
			}
		}

		const baseDelay = this.options.baseRetryDelayMs ?? 1200;
		const jitter = Math.floor(Math.random() * 250);
		return baseDelay * 2 ** attempt + jitter;
	}

	private shouldRetry(response: Response) {
		return response.status === 429 || response.status >= 500;
	}

	private async request(path: string, init: RequestInit) {
		const maxRetries = this.options.maxRetries ?? 1;
		const url = `https://api.cloudflare.com/client/v4/accounts/${this.options.accountId}${path}`;

		for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
			const response = await fetch(url, {
				...init,
				headers: {
					Authorization: `Bearer ${this.options.apiToken}`,
					...(init.headers || {}),
				},
			});

			if (!response.ok) {
				if (attempt < maxRetries && this.shouldRetry(response)) {
					const delayMs = this.getRetryDelayMs(response, attempt);
					console.warn(
						`Cloudflare API rate limited or unavailable (${response.status}). Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries}).`,
					);
					await this.sleep(delayMs);
					continue;
				}

				let responseText = "";
				try {
					responseText = await response.text();
				} catch {
					responseText = "";
				}

				throw new Error(
					`Cloudflare API request failed: ${response.status} ${response.statusText}${responseText ? ` - ${responseText}` : ""}`,
				);
			}

			const payload = (await response.json()) as {
				success?: boolean;
				result?: unknown;
				errors?: Array<{ message?: string }>;
			};

			if (payload.success === false) {
				const errorMessage =
					payload.errors
						?.map((item) => item.message)
						.filter(Boolean)
						.join("; ") || "Unknown Cloudflare API error";
				throw new Error(errorMessage);
			}

			return payload.result;
		}

		throw new Error("Cloudflare API request failed after exhausting retries.");
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
}

export class CloudflareR2Client {
	private readonly client: S3Client;

	constructor(private readonly options: R2ClientOptions) {
		this.client = new S3Client({
			region: "auto",
			endpoint: `https://${options.accountId}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: options.accessKeyId,
				secretAccessKey: options.secretAccessKey,
			},
		});
	}

	async putObject(object: R2Object) {
		await this.client.send(
			new PutObjectCommand({
				Bucket: this.options.bucket,
				Key: object.key,
				Body: object.value,
				ContentType: object.contentType || "application/json; charset=utf-8",
			}),
		);
	}
}
