import type { ExperimentalAssistantArtifact } from "./types";

const ARTIFACT_CACHE_PREFIX = "experimental-assistant-artifact";
const QUERY_EMBEDDING_CACHE_PREFIX = "experimental-assistant-query-embedding";
const ARTIFACT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const QUERY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type StoredArtifactPayload = {
	createdAt: number;
	artifact: ExperimentalAssistantArtifact;
};

type StoredQueryEmbeddingPayload = {
	createdAt: number;
	embedding: number[];
};

function isBrowser() {
	return typeof window !== "undefined";
}

function getArtifactCacheKey(sourceHash: string) {
	return `${ARTIFACT_CACHE_PREFIX}:${sourceHash}`;
}

function getQueryEmbeddingCacheKey(
	sourceHash: string,
	model: string,
	query: string,
) {
	return `${QUERY_EMBEDDING_CACHE_PREFIX}:${sourceHash}:${model}:${query.trim().toLowerCase()}`;
}

export function readCachedArtifact(sourceHash: string) {
	if (!isBrowser()) {
		return null;
	}

	try {
		const raw = window.localStorage.getItem(getArtifactCacheKey(sourceHash));

		if (!raw) {
			return null;
		}

		const payload = JSON.parse(raw) as StoredArtifactPayload;

		if (
			!payload?.artifact ||
			Date.now() - payload.createdAt > ARTIFACT_CACHE_TTL_MS
		) {
			window.localStorage.removeItem(getArtifactCacheKey(sourceHash));
			return null;
		}

		return payload.artifact;
	} catch {
		return null;
	}
}

export function cacheArtifact(artifact: ExperimentalAssistantArtifact) {
	if (!isBrowser()) {
		return;
	}

	try {
		window.localStorage.setItem(
			getArtifactCacheKey(artifact.sourceHash),
			JSON.stringify({
				createdAt: Date.now(),
				artifact,
			} satisfies StoredArtifactPayload),
		);
	} catch {
		// ignore storage quota issues
	}
}

export function readCachedQueryEmbedding(
	sourceHash: string,
	model: string,
	query: string,
) {
	if (!isBrowser()) {
		return null;
	}

	try {
		const raw = window.localStorage.getItem(
			getQueryEmbeddingCacheKey(sourceHash, model, query),
		);

		if (!raw) {
			return null;
		}

		const payload = JSON.parse(raw) as StoredQueryEmbeddingPayload;

		if (
			!Array.isArray(payload?.embedding) ||
			Date.now() - payload.createdAt > QUERY_CACHE_TTL_MS
		) {
			window.localStorage.removeItem(
				getQueryEmbeddingCacheKey(sourceHash, model, query),
			);
			return null;
		}

		return payload.embedding;
	} catch {
		return null;
	}
}

export function cacheQueryEmbedding(
	sourceHash: string,
	model: string,
	query: string,
	embedding: number[],
) {
	if (!isBrowser()) {
		return;
	}

	try {
		window.localStorage.setItem(
			getQueryEmbeddingCacheKey(sourceHash, model, query),
			JSON.stringify({
				createdAt: Date.now(),
				embedding,
			} satisfies StoredQueryEmbeddingPayload),
		);
	} catch {
		// ignore storage quota issues
	}
}
