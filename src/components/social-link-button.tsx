import { Link } from "@heroui/react";
import { button as buttonStyles } from "@heroui/theme";
import type { ReactNode } from "react";

type SocialLinkButtonProps = {
	href: string;
	label: string;
	icon: ReactNode;
	isExternal?: boolean;
};

export function SocialLinkButton({
	href,
	label,
	icon,
	isExternal = true,
}: SocialLinkButtonProps) {
	return (
		<Link
			className={buttonStyles({ radius: "full", variant: "bordered" })}
			href={href}
			isExternal={isExternal}
		>
			{icon}
			{label}
		</Link>
	);
}
