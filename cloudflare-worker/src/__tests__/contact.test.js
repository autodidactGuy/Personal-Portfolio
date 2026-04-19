import { describe, expect, it } from "vitest";
import worker from "../index.js";

const ALLOWED_ORIGIN = "https://hassanraza.us";

const env = {
	ALLOWED_ORIGINS: ALLOWED_ORIGIN,
	ORIGIN: ALLOWED_ORIGIN,
	GITHUB_CLIENT_ID: "test-id",
	GITHUB_CLIENT_SECRET: "test-secret",
	ALLOWED_GITHUB_USERS: "autodidactGuy",
};

function buildRequest(method, origin, body, contentType = "application/json") {
	const headers = new Headers();

	if (origin) {
		headers.set("Origin", origin);
	}

	if (contentType) {
		headers.set("Content-Type", contentType);
	}

	const init = { method, headers };

	if (body !== undefined) {
		init.body = JSON.stringify(body);
	}

	return new Request("https://worker.test/contact", init);
}

const validPayload = {
	name: "Jane Doe",
	email: "jane@example.com",
	phone: "1234567890",
	subject: "Hello from the tests",
	message: "This is a test message body",
};

describe("/contact", () => {
	it("returns 200 for a valid POST from an allowed origin", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, validPayload);
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.message).toBe("Message received");
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
			ALLOWED_ORIGIN,
		);
	});

	it("returns 200 when phone is omitted", async () => {
		const { phone, ...payload } = validPayload;
		const request = buildRequest("POST", ALLOWED_ORIGIN, payload);
		const response = await worker.fetch(request, env);

		expect(response.status).toBe(200);
		expect((await response.json()).success).toBe(true);
	});

	it("returns 403 when no origin can be determined", async () => {
		const request = buildRequest("POST", null, validPayload);
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe("Invalid origin");
	});

	it("accepts origin from Referer header when Origin is absent", async () => {
		const headers = new Headers();
		headers.set("Referer", `${ALLOWED_ORIGIN}/some-page`);
		headers.set("Content-Type", "application/json");

		const request = new Request("https://worker.test/contact", {
			method: "POST",
			headers,
			body: JSON.stringify(validPayload),
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it("returns 403 for a disallowed origin", async () => {
		const request = buildRequest(
			"POST",
			"https://evil.example.com",
			validPayload,
		);
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe("Invalid origin");
	});

	it("returns 204 for OPTIONS preflight from allowed origin", async () => {
		const request = buildRequest("OPTIONS", ALLOWED_ORIGIN);
		const response = await worker.fetch(request, env);

		expect(response.status).toBe(204);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
			ALLOWED_ORIGIN,
		);
		expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
			"POST",
		);
	});

	it("returns 405 for GET requests", async () => {
		const request = buildRequest("GET", ALLOWED_ORIGIN);
		const response = await worker.fetch(request, env);

		expect(response.status).toBe(405);
		expect((await response.json()).error).toBe("Method not allowed");
	});

	it("returns 415 for non-JSON Content-Type", async () => {
		const headers = new Headers();
		headers.set("Origin", ALLOWED_ORIGIN);
		headers.set("Content-Type", "text/plain");

		const request = new Request("https://worker.test/contact", {
			method: "POST",
			headers,
			body: "not json",
		});
		const response = await worker.fetch(request, env);

		expect(response.status).toBe(415);
	});

	it("returns 400 for invalid JSON", async () => {
		const headers = new Headers();
		headers.set("Origin", ALLOWED_ORIGIN);
		headers.set("Content-Type", "application/json");

		const request = new Request("https://worker.test/contact", {
			method: "POST",
			headers,
			body: "not json",
		});
		const response = await worker.fetch(request, env);

		expect(response.status).toBe(400);
		expect((await response.json()).error).toBe("Invalid JSON body");
	});

	it("returns 422 when required fields are missing", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.error).toBe("Validation failed");
		expect(data.fields).toContain("name is required");
		expect(data.fields).toContain("A valid email is required");
		expect(data.fields).toContain("subject must be at least 10 characters");
		expect(data.fields).toContain("message must be at least 10 characters");
	});

	it("returns 422 for invalid email format", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			email: "not-an-email",
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("A valid email is required");
	});

	it("returns 422 for email with multiple @ characters", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			email: "a@b@c.com",
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("A valid email is required");
	});

	it("returns 422 for invalid phone number", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			phone: "123",
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("phone must be a 10-digit number");
	});

	it("returns 422 when subject is too short", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			subject: "Hi",
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("subject must be at least 10 characters");
	});

	it("returns 422 when message is too short", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			message: "Hi",
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("message must be at least 10 characters");
	});

	it("returns 422 when name exceeds max length", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			name: "a".repeat(101),
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("name must not exceed 100 characters");
	});

	it("returns 422 when subject exceeds max length", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			subject: "a".repeat(201),
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("subject must not exceed 200 characters");
	});

	it("returns 422 when message exceeds max length", async () => {
		const request = buildRequest("POST", ALLOWED_ORIGIN, {
			...validPayload,
			message: "a".repeat(5001),
		});
		const response = await worker.fetch(request, env);
		const data = await response.json();

		expect(response.status).toBe(422);
		expect(data.fields).toContain("message must not exceed 5000 characters");
	});
});
