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
