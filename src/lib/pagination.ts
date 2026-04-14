export const CONTENT_PAGE_SIZE = 10;

export function getTotalPages(itemCount: number, pageSize = CONTENT_PAGE_SIZE) {
	return Math.max(1, Math.ceil(itemCount / pageSize));
}

export function getPaginatedItems<T>(
	items: T[],
	page: number,
	pageSize = CONTENT_PAGE_SIZE,
) {
	const startIndex = (page - 1) * pageSize;
	return items.slice(startIndex, startIndex + pageSize);
}
