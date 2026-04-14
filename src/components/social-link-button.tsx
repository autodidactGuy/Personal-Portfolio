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
		<a
			className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-default-200/80 bg-default px-4 text-sm font-medium text-default-foreground shadow-sm transition-colors hover:bg-default-hover dark:border-default-200/80 dark:bg-default dark:text-default-foreground dark:hover:bg-default-hover"
			href={href}
			rel={isExternal ? "noreferrer" : undefined}
			target={isExternal ? "_blank" : undefined}
		>
			{icon}
			{label}
		</a>
	);
}
