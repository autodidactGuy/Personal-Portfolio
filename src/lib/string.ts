export function toTitleCase(value?: string | null) {
	if (!value) {
		return "";
	}

	return value
		.split(/[\s_-]+/)
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
		)
		.join(" ");
}
