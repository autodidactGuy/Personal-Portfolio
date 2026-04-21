export function getAllowedOrigins(env) {
	return String(env.ALLOWED_ORIGINS || env.ORIGIN || "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
}

export function isLocalDevelopmentOrigin(origin) {
	try {
		const url = new URL(origin);

		return (
			url.protocol === "http:" &&
			(url.hostname === "localhost" ||
				url.hostname === "127.0.0.1" ||
				url.hostname === "0.0.0.0")
		);
	} catch {
		return false;
	}
}

export function isAllowedOrigin(origin, env) {
	if (getAllowedOrigins(env).includes(origin)) {
		return true;
	}

	return isLocalDevelopmentOrigin(origin);
}

export function sanitizeOriginCandidate(value) {
	if (!value) {
		return null;
	}

	const trimmedValue = String(value).trim();

	if (!trimmedValue) {
		return null;
	}

	const withoutUnexpectedQuery = trimmedValue.split("?")[0];

	try {
		return new URL(withoutUnexpectedQuery).origin;
	} catch {
		return null;
	}
}

export function getRequestOrigin(request, url) {
	const explicitOrigin = sanitizeOriginCandidate(
		url.searchParams.get("origin"),
	);

	if (explicitOrigin) {
		return explicitOrigin;
	}

	const originHeader = sanitizeOriginCandidate(request.headers.get("Origin"));

	if (originHeader) {
		return originHeader;
	}

	const refererHeader = request.headers.get("Referer");

	if (!refererHeader) {
		return null;
	}

	try {
		return new URL(refererHeader).origin;
	} catch {
		return null;
	}
}
