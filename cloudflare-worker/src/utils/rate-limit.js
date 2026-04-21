const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_MAX_ENTRIES = 10000;
const RATE_LIMIT_PRUNE_INTERVAL_MS = 60 * 1000;

export const rateLimitMap = new Map();

let lastPruneTime = 0;

function pruneExpiredEntries(now) {
	if (now - lastPruneTime < RATE_LIMIT_PRUNE_INTERVAL_MS) {
		return;
	}

	lastPruneTime = now;

	for (const [ip, entry] of rateLimitMap) {
		const valid = entry.timestamps.filter(
			(timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
		);

		if (valid.length === 0) {
			rateLimitMap.delete(ip);
			continue;
		}

		entry.timestamps = valid;
	}

	if (rateLimitMap.size <= RATE_LIMIT_MAX_ENTRIES) {
		return;
	}

	const excess = rateLimitMap.size - RATE_LIMIT_MAX_ENTRIES;
	const iterator = rateLimitMap.keys();

	for (let index = 0; index < excess; index += 1) {
		rateLimitMap.delete(iterator.next().value);
	}
}

export function isRateLimited(ip, options = {}) {
	const { windowMs = RATE_LIMIT_WINDOW_MS, max = RATE_LIMIT_MAX } = options;
	const now = Date.now();

	pruneExpiredEntries(now);

	const entry = rateLimitMap.get(ip);

	if (!entry) {
		rateLimitMap.set(ip, { timestamps: [now] });
		return false;
	}

	entry.timestamps = entry.timestamps.filter(
		(timestamp) => now - timestamp < windowMs,
	);

	if (entry.timestamps.length === 0) {
		rateLimitMap.delete(ip);
		rateLimitMap.set(ip, { timestamps: [now] });
		return false;
	}

	if (entry.timestamps.length >= max) {
		return true;
	}

	entry.timestamps.push(now);
	return false;
}

export function resetRateLimitState() {
	rateLimitMap.clear();
	lastPruneTime = 0;
}
