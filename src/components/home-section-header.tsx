import Link from "next/link";

type HomeSectionHeaderProps = {
	title: string;
	actionHref?: string;
	actionLabel?: string;
};

export function HomeSectionHeader({
	title,
	actionHref,
	actionLabel = "View all",
}: HomeSectionHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<h2 className="text-2xl font-semibold">{title}</h2>
			{actionHref ? (
				<Link
					className="inline-flex w-fit items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary transition-transform duration-300 group-hover:translate-x-0.5"
					href={actionHref}
				>
					{actionLabel}
				</Link>
			) : null}
		</div>
	);
}
