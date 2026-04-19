function parseCookies(cookieHeader) {
	return String(cookieHeader || "")
		.split(";")
		.map((part) => part.trim())
		.filter(Boolean)
		.reduce((cookies, part) => {
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

function serializeCookie(name, value, maxAgeSeconds) {
	const segments = [
		`${name}=${encodeURIComponent(value)}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		maxAgeSeconds === 0 ? "Max-Age=0" : `Max-Age=${maxAgeSeconds}`,
	];

	return segments.join("; ");
}

function withClearedOauthCookies(headers = new Headers()) {
	headers.append("Set-Cookie", serializeCookie("oauth_state", "", 0));
	headers.append("Set-Cookie", serializeCookie("oauth_origin", "", 0));
	return headers;
}

function createRedirectResponse(location, headers = new Headers()) {
	headers.set("Location", location);
	return new Response(null, {
		status: 302,
		headers,
	});
}

function getAllowedOrigins(env) {
	return String(env.ALLOWED_ORIGINS || env.ORIGIN || "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
}

function isAllowedOrigin(origin, env) {
	return getAllowedOrigins(env).includes(origin);
}

function createStateToken() {
	return crypto.randomUUID();
}

function sanitizeOriginCandidate(value) {
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

function corsHeaders(origin) {
	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Max-Age": "86400",
	};
}

function jsonResponse(body, status, extraHeaders = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...extraHeaders,
		},
	});
}

function validateContactPayload(data) {
	const errors = [];

	if (!data || typeof data !== "object") {
		return { valid: false, errors: ["Invalid request body"] };
	}

	if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
		errors.push("name is required");
	}

	if (
		!data.email ||
		typeof data.email !== "string" ||
		!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(data.email)
	) {
		errors.push("A valid email is required");
	}

	if (
		!data.subject ||
		typeof data.subject !== "string" ||
		data.subject.trim().length < 10
	) {
		errors.push("subject must be at least 10 characters");
	}

	if (
		!data.message ||
		typeof data.message !== "string" ||
		data.message.trim().length < 10
	) {
		errors.push("message must be at least 10 characters");
	}

	if (data.phone !== undefined && data.phone !== null && data.phone !== "") {
		if (typeof data.phone !== "string" || !/^\d{10}$/.test(data.phone)) {
			errors.push("phone must be a 10-digit number");
		}
	}

	return { valid: errors.length === 0, errors };
}

function getRequestOrigin(request, url) {
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

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const callbackUrl = `${url.origin}/callback`;

		if (url.pathname === "/auth") {
			const requestedOrigin = getRequestOrigin(request, url);

			if (!requestedOrigin || !isAllowedOrigin(requestedOrigin, env)) {
				return new Response("Invalid origin", {
					status: 400,
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				});
			}

			const state = createStateToken();
			const githubUrl = new URL("https://github.com/login/oauth/authorize");
			githubUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
			githubUrl.searchParams.set("scope", env.GITHUB_OAUTH_SCOPE || "repo");
			githubUrl.searchParams.set("redirect_uri", callbackUrl);
			githubUrl.searchParams.set("state", state);

			const headers = new Headers();
			headers.append("Set-Cookie", serializeCookie("oauth_state", state, 600));
			headers.append(
				"Set-Cookie",
				serializeCookie("oauth_origin", requestedOrigin, 600),
			);
			return createRedirectResponse(githubUrl.toString(), headers);
		}

		if (url.pathname === "/callback") {
			const code = url.searchParams.get("code");
			const returnedState = url.searchParams.get("state");
			const cookies = parseCookies(request.headers.get("Cookie"));
			const expectedState = cookies.oauth_state;
			const openerOrigin = cookies.oauth_origin;

			if (!code) {
				return new Response("Missing OAuth code", { status: 400 });
			}

			if (!returnedState || !expectedState || returnedState !== expectedState) {
				return new Response("Invalid OAuth state", {
					status: 400,
					headers: withClearedOauthCookies(
						new Headers({ "Content-Type": "text/plain; charset=utf-8" }),
					),
				});
			}

			if (!openerOrigin || !isAllowedOrigin(openerOrigin, env)) {
				return new Response("Invalid opener origin", {
					status: 400,
					headers: withClearedOauthCookies(
						new Headers({ "Content-Type": "text/plain; charset=utf-8" }),
					),
				});
			}

			const tokenResponse = await fetch(
				"https://github.com/login/oauth/access_token",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						"User-Agent": "decap-cms-oauth-worker",
					},
					body: JSON.stringify({
						client_id: env.GITHUB_CLIENT_ID,
						client_secret: env.GITHUB_CLIENT_SECRET,
						code,
						redirect_uri: callbackUrl,
					}),
				},
			);

			const tokenData = await tokenResponse.json();

			if (!tokenData.access_token) {
				return new Response(`OAuth failed: ${JSON.stringify(tokenData)}`, {
					status: 400,
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				});
			}

			const profileResponse = await fetch("https://api.github.com/user", {
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: `Bearer ${tokenData.access_token}`,
					"User-Agent": "decap-cms-oauth-worker",
				},
			});

			if (!profileResponse.ok) {
				return new Response("Failed to fetch GitHub profile", { status: 403 });
			}

			const profile = await profileResponse.json();
			const username = String(profile.login || "").toLowerCase();
			const allowedUsers = String(env.ALLOWED_GITHUB_USERS || "")
				.split(",")
				.map((value) => value.trim().toLowerCase())
				.filter(Boolean);

			if (!allowedUsers.includes(username)) {
				return new Response(`Access denied for GitHub user: ${profile.login}`, {
					status: 403,
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				});
			}

			const tokenPayload = JSON.stringify({ token: tokenData.access_token });

			const headers = withClearedOauthCookies(
				new Headers({ "Content-Type": "text/html; charset=utf-8" }),
			);

			return new Response(
				`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Login complete</title>
  </head>
  <body>
    <script>
      const receiveMessage = () => {
        window.opener.postMessage(
          'authorization:github:success:${tokenPayload}',
          '${openerOrigin}'
        );
        window.removeEventListener('message', receiveMessage, false);
        window.close();
      };

      window.addEventListener('message', receiveMessage, false);
      window.opener.postMessage('authorizing:github', '${openerOrigin}');
    </script>
    Login complete. You can close this window.
  </body>
</html>`,
				{
					headers,
				},
			);
		}

		if (url.pathname === "/contact") {
			const origin = sanitizeOriginCandidate(request.headers.get("Origin"));

			if (!origin || !isAllowedOrigin(origin, env)) {
				return jsonResponse({ error: "Invalid origin" }, 403);
			}

			if (request.method === "OPTIONS") {
				return new Response(null, {
					status: 204,
					headers: corsHeaders(origin),
				});
			}

			if (request.method !== "POST") {
				return jsonResponse(
					{ error: "Method not allowed" },
					405,
					corsHeaders(origin),
				);
			}

			const contentType = request.headers.get("Content-Type") || "";

			if (!contentType.includes("application/json")) {
				return jsonResponse(
					{ error: "Content-Type must be application/json" },
					415,
					corsHeaders(origin),
				);
			}

			let body;

			try {
				body = await request.json();
			} catch {
				return jsonResponse(
					{ error: "Invalid JSON body" },
					400,
					corsHeaders(origin),
				);
			}

			const { valid, errors } = validateContactPayload(body);

			if (!valid) {
				return jsonResponse(
					{ error: "Validation failed", fields: errors },
					422,
					corsHeaders(origin),
				);
			}

			return jsonResponse(
				{ success: true, message: "Message received" },
				200,
				corsHeaders(origin),
			);
		}

		return new Response("Not found", { status: 404 });
	},
};
