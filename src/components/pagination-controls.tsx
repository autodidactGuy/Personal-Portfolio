import Link from "next/link";

type PaginationControlsProps = {
	basePath: string;
	currentPage: number;
	totalPages: number;
};

function getPageHref(basePath: string, page: number) {
	return page <= 1 ? basePath : `${basePath}/page/${page}`;
}

export function PaginationControls({
	basePath,
	currentPage,
	totalPages,
}: PaginationControlsProps) {
	if (totalPages <= 1) {
		return null;
	}

	return (
		<div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-default-200/70 pt-6 sm:flex-row">
			{currentPage === 1 ? (
				<span className="inline-flex min-w-24 items-center justify-center rounded-full border border-default-200/70 bg-default-100/30 px-4 py-2 text-sm text-default-400 dark:bg-default-100/5">
					Previous
				</span>
			) : (
				<Link
					className="inline-flex min-w-24 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
					href={getPageHref(basePath, currentPage - 1)}
				>
					Previous
				</Link>
			)}
			<p className="text-sm text-default-600">
				Page {currentPage} of {totalPages}
			</p>
			{currentPage === totalPages ? (
				<span className="inline-flex min-w-24 items-center justify-center rounded-full border border-default-200/70 bg-default-100/30 px-4 py-2 text-sm text-default-400 dark:bg-default-100/5">
					Next
				</span>
			) : (
				<Link
					className="inline-flex min-w-24 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
					href={getPageHref(basePath, currentPage + 1)}
				>
					Next
				</Link>
			)}
		</div>
	);
}
