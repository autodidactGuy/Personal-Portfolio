import { Chip } from "@heroui/react";
import type { ReactNode } from "react";

type ContentChipProps = {
	children: ReactNode;
	className?: string;
	size?: "sm" | "md" | "lg";
};

export function AccentContentChip({
	children,
	className = "",
	size = "sm",
}: ContentChipProps) {
	return (
		<Chip className={`${className}`} size={size} color="accent" variant="soft">
			<Chip.Label>{children}</Chip.Label>
		</Chip>
	);
}

export function MetaContentChip({
	children,
	className = "",
	size = "sm",
}: ContentChipProps) {
	return (
		<Chip
			className={`border border-default-400/70 bg-default-100/55 text-default-600 shadow-none dark:text-default-600 ${className}`}
			color="default"
			size={size}
			variant="secondary"
		>
			<Chip.Label className="flex items-center gap-1.5 px-0.5 text-[11px] font-medium">
				{children}
			</Chip.Label>
		</Chip>
	);
}
