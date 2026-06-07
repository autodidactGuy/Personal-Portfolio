export type AssistantMessageBlock =
	| { type: "paragraph"; lines: string[] }
	| { type: "list"; items: string[]; ordered: boolean }
	| { type: "table"; rows: string[][] }
	| { type: "heading"; level: 2 | 3 | 4; text: string }
	| { type: "quote"; lines: string[] }
	| { type: "code"; language: string; code: string };

const ASSISTANT_CITATION_PATTERN =
	/【[^】]+】|\[(rag:[^\]]+|summary|about|skills|links|contact|hero|focus|stats|experience:[^\]]+|education:[^\]]+|project:[^\]]+|article:[^\]]+|case-study:[^\]]+|recommendation:[^\]]+)\]/gi;

function isWordLikeCharacter(value: string | undefined) {
	return Boolean(value && /[A-Za-z0-9]/.test(value));
}

function cleanAssistantCitationSpacing(value: string) {
	return value
		.replace(/[ \t]+([,.;:!?])/g, "$1")
		.replace(/([([])[ \t]+/g, "$1")
		.replace(/[ \t]{2,}/g, " ");
}

export function stripAssistantCitationMarkers(text: string) {
	let result = "";
	let lastIndex = 0;
	let match: RegExpExecArray | null = ASSISTANT_CITATION_PATTERN.exec(text);

	while (match) {
		const start = match.index ?? 0;
		const end = start + match[0].length;
		result += text.slice(lastIndex, start);

		const previousChar = result.at(-1);
		const nextChar = text[end];
		const nextSlice = text.slice(end);
		const nextNonWhitespace = text.slice(end).match(/\S/)?.[0];
		const currentLine = result.slice(result.lastIndexOf("\n") + 1);
		const openingParenthesisMatch = result.match(/[ \t]*\([ \t]*$/);
		const closingParenthesisMatch = text.slice(end).match(/^[ \t]*\)/);

		if (openingParenthesisMatch && closingParenthesisMatch) {
			result = result.slice(0, -openingParenthesisMatch[0].length);
			const afterWrapperIndex = end + closingParenthesisMatch[0].length;

			if (
				isWordLikeCharacter(result.at(-1)) &&
				isWordLikeCharacter(text[afterWrapperIndex])
			) {
				result += " ";
			}

			lastIndex = afterWrapperIndex;
			ASSISTANT_CITATION_PATTERN.lastIndex = afterWrapperIndex;
			match = ASSISTANT_CITATION_PATTERN.exec(text);
			continue;
		}

		if (
			/[,:;]\s*$/.test(result) &&
			(!nextNonWhitespace || /[.?!,;:)}\]]/.test(nextNonWhitespace))
		) {
			result = result.replace(/[,:;]\s*$/g, "");
		}

		if (isWordLikeCharacter(previousChar) && isWordLikeCharacter(nextChar)) {
			result += " ";
		}

		if (
			/^[ \t]*\|/.test(nextSlice) &&
			currentLine.trim() &&
			!currentLine.trimStart().startsWith("|")
		) {
			result += "\n";
		}

		lastIndex = end;
		match = ASSISTANT_CITATION_PATTERN.exec(text);
	}

	ASSISTANT_CITATION_PATTERN.lastIndex = 0;

	return cleanAssistantCitationSpacing(`${result}${text.slice(lastIndex)}`);
}

function parsePipeTableCells(line: string) {
	return line
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map((cell) => cell.trim());
}

function looksLikePipeDelimitedTableLine(line: string) {
	if (!line.includes("|")) {
		return false;
	}

	const cells = parsePipeTableCells(line);
	return cells.length >= 3 && cells.some((cell) => cell.length > 0);
}

function normalizeAssistantTableFormatting(content: string) {
	return content
		.split("\n")
		.flatMap((line) => {
			if (!line.trim()) {
				return [line];
			}

			const firstPipeIndex = line.indexOf("|");

			if (
				firstPipeIndex > 0 &&
				!line.trimStart().startsWith("|") &&
				looksLikePipeDelimitedTableLine(line.slice(firstPipeIndex))
			) {
				return [line.slice(0, firstPipeIndex), line.slice(firstPipeIndex)];
			}

			const italicBlockIndex = line.indexOf("|*");

			if (italicBlockIndex >= 0) {
				const tableCandidate = line.slice(0, italicBlockIndex + 1);

				if (looksLikePipeDelimitedTableLine(tableCandidate)) {
					return [tableCandidate, line.slice(italicBlockIndex + 1)];
				}
			}

			return [line];
		})
		.join("\n");
}

function normalizeAssistantProseContent(content: string) {
	return normalizeAssistantTableFormatting(
		stripAssistantCitationMarkers(content)
			.replace(/\\n/g, "\n")
			.replace(/(^|[\t ]+)\/n(?=[\t ]+|$)/gm, "$1\n")
			.replace(/:\s*(\d+\.\s+)/g, ":\n$1")
			.replace(/^\s*(---+|___+|\*\*\*+)\s*$/gm, "\n")
			.replace(/\*{2}\s*\n\s*/g, "**")
			.replace(/\s*\n\s*\*{2}/g, "**")
			.replace(/\*{1}\s*\n\s*/g, "*")
			.replace(/\s*\n\s*\*{1}/g, "*")
			.replace(/[ \t]{2,}/g, " ")
			.replace(/[ \t]+\n/g, "\n")
			.replace(/\n[ \t]+/g, "\n")
			.replace(/\n{3,}/g, "\n\n")
			.trim(),
	);
}

export function normalizeAssistantDisplayContent(content: string) {
	const normalizedContent = content.replace(/\r\n/g, "\n");
	const lines = normalizedContent.split("\n");
	const segments: Array<{ type: "prose" | "code"; text: string }> = [];
	let buffer: string[] = [];
	let inCodeFence = false;

	const flushBuffer = () => {
		if (!buffer.length) {
			return;
		}

		segments.push({
			type: inCodeFence ? "code" : "prose",
			text: buffer.join("\n"),
		});
		buffer = [];
	};

	for (const rawLine of lines) {
		const line = rawLine.trim();

		if (/^```[A-Za-z0-9_-]*\s*$/.test(line)) {
			if (inCodeFence) {
				buffer.push(line);
				flushBuffer();
				inCodeFence = false;
				continue;
			}

			flushBuffer();
			inCodeFence = true;
			buffer.push(line);
			continue;
		}

		buffer.push(rawLine);
	}

	flushBuffer();

	return segments
		.map((segment) =>
			segment.type === "code"
				? segment.text
				: normalizeAssistantProseContent(segment.text),
		)
		.filter(Boolean)
		.join("\n")
		.trim();
}

function isAssistantSeparatorLine(line: string) {
	return /^([-_*])\1{2,}$/.test(line.trim());
}

function isAssistantTableLine(line: string) {
	return (
		/^\|/.test(line) ||
		looksLikePipeDelimitedTableLine(line) ||
		/^[^\t\n]+(?:\t[^\t\n]+){2,}$/.test(line)
	);
}

export function parseAssistantTableLine(line: string) {
	const cells = /\t/.test(line)
		? line.split("\t").map((cell) => cell.trim())
		: parsePipeTableCells(line);

	if (
		!cells.length ||
		cells.every((cell) => !cell) ||
		cells.every((cell) => /^:?-{3,}:?$/.test(cell))
	) {
		return [];
	}

	return cells;
}

export function parseAssistantMessageBlocks(
	content: string,
): AssistantMessageBlock[] {
	const normalizedContent = normalizeAssistantDisplayContent(content);
	const lines = normalizedContent.split("\n");
	const blocks: AssistantMessageBlock[] = [];
	let paragraphBuffer: string[] = [];
	let listBuffer: string[] = [];
	let tableBuffer: string[][] = [];
	let quoteBuffer: string[] = [];
	let codeBuffer: { language: string; lines: string[] } | null = null;
	let listOrdered = false;
	let pendingListBreak = false;

	const flushParagraphBuffer = () => {
		if (!paragraphBuffer.length) {
			return;
		}

		blocks.push({
			type: "paragraph",
			lines: paragraphBuffer,
		});
		paragraphBuffer = [];
	};

	const flushListBuffer = () => {
		if (!listBuffer.length) {
			return;
		}

		blocks.push({
			type: "list",
			items: listBuffer,
			ordered: listOrdered,
		});
		listBuffer = [];
		listOrdered = false;
		pendingListBreak = false;
	};

	const flushTableBuffer = () => {
		if (!tableBuffer.length) {
			return;
		}

		blocks.push({
			type: "table",
			rows: tableBuffer,
		});
		tableBuffer = [];
	};

	const flushQuoteBuffer = () => {
		if (!quoteBuffer.length) {
			return;
		}

		blocks.push({
			type: "quote",
			lines: quoteBuffer,
		});
		quoteBuffer = [];
	};

	const flushInlineBuffers = () => {
		flushParagraphBuffer();
		flushListBuffer();
		flushTableBuffer();
		flushQuoteBuffer();
	};

	const appendToCurrentListItem = (line: string) => {
		if (!listBuffer.length) {
			return false;
		}

		const lastIndex = listBuffer.length - 1;
		listBuffer[lastIndex] = `${listBuffer[lastIndex]}\n${line}`.trim();
		return true;
	};

	for (const rawLine of lines) {
		const line = rawLine.trim();
		const fenceMatch = line.match(/^```([A-Za-z0-9_-]+)?\s*$/);

		if (codeBuffer) {
			if (fenceMatch) {
				blocks.push({
					type: "code",
					language: codeBuffer.language,
					code: codeBuffer.lines.join("\n"),
				});
				codeBuffer = null;
				continue;
			}

			codeBuffer.lines.push(rawLine.replace(/\s+$/g, ""));
			continue;
		}

		if (fenceMatch) {
			flushInlineBuffers();
			codeBuffer = {
				language: fenceMatch[1] || "",
				lines: [],
			};
			continue;
		}

		if (!line || isAssistantSeparatorLine(line)) {
			flushTableBuffer();
			flushQuoteBuffer();
			if (listBuffer.length) {
				pendingListBreak = true;
			} else {
				flushParagraphBuffer();
				flushListBuffer();
			}
			continue;
		}

		const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

		if (headingMatch) {
			flushInlineBuffers();
			const depth = headingMatch[1]?.length || 2;
			const level = Math.min(Math.max(depth + 1, 2), 4) as 2 | 3 | 4;

			blocks.push({
				type: "heading",
				level,
				text: headingMatch[2]?.trim() || "",
			});
			continue;
		}

		const quoteMatch = line.match(/^>\s?(.*)$/);

		if (quoteMatch) {
			flushParagraphBuffer();
			flushListBuffer();
			flushTableBuffer();
			pendingListBreak = false;
			quoteBuffer.push(quoteMatch[1]?.trim() || "");
			continue;
		}

		flushQuoteBuffer();

		if (isAssistantTableLine(line)) {
			flushParagraphBuffer();
			flushListBuffer();
			pendingListBreak = false;
			const cells = parseAssistantTableLine(line);

			if (cells.length) {
				tableBuffer.push(cells);
			}
			continue;
		}

		flushTableBuffer();

		if (/^-\s+/.test(line)) {
			flushParagraphBuffer();
			if (listBuffer.length && listOrdered) {
				flushListBuffer();
			}
			listOrdered = false;
			pendingListBreak = false;
			listBuffer.push(line.replace(/^-\s+/, "").trim());
			continue;
		}

		if (/^\d+\.\s+/.test(line)) {
			flushParagraphBuffer();
			if (listBuffer.length && !listOrdered) {
				flushListBuffer();
			}
			listOrdered = true;
			pendingListBreak = false;
			listBuffer.push(line.replace(/^\d+\.\s+/, "").trim());
			continue;
		}

		if (appendToCurrentListItem(line)) {
			pendingListBreak = false;
			continue;
		}

		if (pendingListBreak) {
			flushListBuffer();
		}

		flushListBuffer();
		paragraphBuffer.push(line);
	}

	if (codeBuffer) {
		blocks.push({
			type: "code",
			language: codeBuffer.language,
			code: codeBuffer.lines.join("\n"),
		});
	}

	flushInlineBuffers();

	return blocks;
}
