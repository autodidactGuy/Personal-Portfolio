const contentIconPackIds = [
	"ai",
	"bi",
	"bs",
	"cg",
	"ci",
	"di",
	"fa",
	"fa6",
	"fc",
	"fi",
	"gi",
	"go",
	"gr",
	"hi",
	"hi2",
	"im",
	"io",
	"io5",
	"lia",
	"lu",
	"md",
	"pi",
	"ri",
	"rx",
	"si",
	"sl",
	"tb",
	"tfi",
	"ti",
	"vsc",
	"wi",
] as const;

type ContentIconPackId = (typeof contentIconPackIds)[number];

export type ContentIconId = `${string}:${string}`;
export { contentIconPackIds };

function isContentIconPackId(value: string): value is ContentIconPackId {
	return contentIconPackIds.includes(value as ContentIconPackId);
}

export function isContentIconId(value: string): value is ContentIconId {
	const [pack, name, ...rest] = value.split(":");

	return Boolean(
		pack && name && rest.length === 0 && isContentIconPackId(pack),
	);
}

export function parseContentIconId(iconId?: string | null) {
	if (!iconId || !isContentIconId(iconId)) {
		return null;
	}

	const [pack, name] = iconId.split(":");

	return {
		iconId,
		pack,
		name,
	};
}
