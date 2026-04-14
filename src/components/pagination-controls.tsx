import { Button } from "@heroui/react";
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
			<Button
				as={Link}
				href={getPageHref(basePath, currentPage - 1)}
				isDisabled={currentPage === 1}
				radius="full"
				variant="flat"
			>
				Previous
			</Button>
			<p className="text-sm text-default-600">
				Page {currentPage} of {totalPages}
			</p>
			<Button
				as={Link}
				href={getPageHref(basePath, currentPage + 1)}
				isDisabled={currentPage === totalPages}
				radius="full"
				variant="flat"
			>
				Next
			</Button>
		</div>
	);
}
