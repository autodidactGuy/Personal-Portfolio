type OriginEnv = {
	ALLOWED_ORIGINS?: string;
	ORIGIN?: string;
};

export function getAllowedOrigins(env: OriginEnv) {
	return String(env.ALLOWED_ORIGINS || env.ORIGIN || "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
}

export function isLocalDevelopmentOrigin(origin: string) {
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

export function isAllowedOrigin(
	origin: string,
	env: OriginEnv,
	requestOrigin?: string | null,
) {
	if (requestOrigin && origin === requestOrigin) {
		return true;
	}

	if (getAllowedOrigins(env).includes(origin)) {
		return true;
	}

	return isLocalDevelopmentOrigin(origin);
}

export function sanitizeOriginCandidate(value: string | null) {
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

export function getRequestOrigin(request: Request, url: URL) {
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
