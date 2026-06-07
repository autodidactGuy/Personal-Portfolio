import { describe, expect, it } from "vitest";
import {
	type AssistantChatMessage,
	getAssistantMessageStatusLabel,
	normalizeAssistantDisplayContent,
	parseAssistantMessageBlocks,
	parseStoredAssistantMessages,
	serializeAssistantMessages,
	stripAssistantCitationMarkers,
} from "./assistant-message-rendering";

describe("assistant message rendering helpers", () => {
	it("keeps paragraphs, line breaks, bold, and italic markers in the supported inline subset", () => {
		const blocks = parseAssistantMessageBlocks(
			"Ships **platform** work with *care*.\nKeeps context grounded.",
		);

		expect(blocks).toEqual([
			{
				type: "paragraph",
				lines: [
					"Ships **platform** work with *care*.",
					"Keeps context grounded.",
				],
			},
		]);
	});

	it("parses ordered and unordered list blocks", () => {
		const blocks = parseAssistantMessageBlocks(
			"- First signal\n- Second signal\n\n1. First step\n2. Second step",
		);

		expect(blocks).toEqual([
			{
				type: "list",
				ordered: false,
				items: ["First signal", "Second signal"],
			},
			{
				type: "list",
				ordered: true,
				items: ["First step", "Second step"],
			},
		]);
	});

	it("parses pipe tables while skipping markdown separator rows", () => {
		const blocks = parseAssistantMessageBlocks(
			"| Area | Impact | Source |\n| --- | --- | --- |\n| Payments | Guardrails | Project |",
		);

		expect(blocks).toEqual([
			{
				type: "table",
				rows: [
					["Area", "Impact", "Source"],
					["Payments", "Guardrails", "Project"],
				],
			},
		]);
	});

	it("handles headings, blockquotes, and fenced code intentionally", () => {
		const blocks = parseAssistantMessageBlocks(
			"## Summary\n> grounded answer\n```ts\nconst status = 'answered';\n```",
		);

		expect(blocks).toEqual([
			{ type: "heading", level: 3, text: "Summary" },
			{ type: "quote", lines: ["grounded answer"] },
			{ type: "code", language: "ts", code: "const status = 'answered';" },
		]);
	});

	it("strips assistant citation markers without erasing nearby prose", () => {
		expect(
			stripAssistantCitationMarkers(
				"Built APIs [rag:project:payments] and shipped them【1:2†source】.",
			),
		).toBe("Built APIs and shipped them.");
	});

	it("normalizes escaped line breaks without splitting dates or prose heuristically", () => {
		expect(
			normalizeAssistantDisplayContent(
				"Launch date: Jan 2. Follow-up stayed on Feb 3.\\nNext line.",
			),
		).toBe("Launch date: Jan 2. Follow-up stayed on Feb 3.\nNext line.");
	});

	it("labels missing, rejected, system, and rate-limited states", () => {
		expect(
			getAssistantMessageStatusLabel({
				role: "assistant",
				status: "missing",
			}),
		).toBe("Missing information");
		expect(
			getAssistantMessageStatusLabel({
				role: "assistant",
				status: "rejected",
			}),
		).toBe("Out of scope");
		expect(
			getAssistantMessageStatusLabel({
				role: "assistant",
				status: "system",
			}),
		).toBe("Assistant note");
		expect(
			getAssistantMessageStatusLabel({
				role: "assistant",
				status: "missing",
				rateLimited: true,
			}),
		).toBe("Rate limited");
		expect(getAssistantMessageStatusLabel({ role: "user" })).toBeNull();
	});

	it("round-trips versioned storage and migrates legacy raw arrays", () => {
		const messages: AssistantChatMessage[] = [
			{
				id: "assistant-1",
				role: "assistant",
				content: "Please retry later.",
				status: "missing",
				rateLimited: true,
			},
		];
		const serialized = serializeAssistantMessages(messages);

		expect(parseStoredAssistantMessages(serialized)).toEqual(messages);
		expect(parseStoredAssistantMessages(JSON.stringify(messages))).toEqual(
			messages,
		);
		expect(parseStoredAssistantMessages('{"version":999,"messages":[]}')).toBeNull();
	});
});
