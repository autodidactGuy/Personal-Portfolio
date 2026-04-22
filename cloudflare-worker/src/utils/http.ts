export function parseCookies(cookieHeader: string | null) {
	return String(cookieHeader || "")
		.split(";")
		.map((part) => part.trim())
		.filter(Boolean)
		.reduce<Record<string, string>>((cookies, part) => {
			const separatorIndex = part.indexOf("=");

			if (separatorIndex === -1) {
				return cookies;
			}

			const key = part.slice(0, separatorIndex).trim();
			const value = part.slice(separatorIndex + 1).trim();
			cookies[key] = decodeURIComponent(value);
			return cookies;
		}, {});
}

export function serializeCookie(
	name: string,
	value: string,
	maxAgeSeconds: number,
) {
	const segments = [
		`${name}=${encodeURIComponent(value)}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		maxAgeSeconds === 0 ? "Max-Age=0" : `Max-Age=${maxAgeSeconds}`,
	];

	return segments.join("; ");
}

export function withClearedOauthCookies(headers = new Headers()) {
	headers.append("Set-Cookie", serializeCookie("oauth_state", "", 0));
	headers.append("Set-Cookie", serializeCookie("oauth_origin", "", 0));
	return headers;
}

export function createRedirectResponse(
	location: string,
	headers = new Headers(),
) {
	headers.set("Location", location);
	return new Response(null, {
		status: 302,
		headers,
	});
}

export function corsHeaders(origin: string | null) {
	return {
		"Access-Control-Allow-Origin": origin || "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Expose-Headers":
			"X-Assistant-Provider, X-Assistant-Providers, X-Assistant-Rate-Limited",
		"Access-Control-Max-Age": "86400",
		Vary: "Origin",
	};
}

export function jsonResponse(
	body: unknown,
	status: number,
	extraHeaders: Record<string, string> = {},
) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...extraHeaders,
		},
	});
}

export async function parseJsonRequest(
	request: Request,
	cors: Record<string, string>,
) {
	try {
		return await request.json();
	} catch {
		throw jsonResponse({ error: "Invalid JSON body" }, 400, cors);
	}
}

export async function parseMaybeJsonResponse(response: Response) {
	const rawText = await response.text();
	const contentType = response.headers.get("Content-Type") || "";

	if (!contentType.toLowerCase().includes("application/json")) {
		return rawText;
	}

	try {
		return JSON.parse(rawText) as unknown;
	} catch {
		return rawText;
	}
}
