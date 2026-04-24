import { Breadcrumbs, BreadcrumbsItem } from "@heroui/react";

type BreadcrumbEntry = {
	label: string;
	href?: string;
};

type PageBreadcrumbsProps = {
	items: BreadcrumbEntry[];
};

export function PageBreadcrumbs({ items }: PageBreadcrumbsProps) {
	return (
		<Breadcrumbs className="mb-5 inline-flex w-fit max-w-[90vw] rounded-full border border-primary/20 bg-primary/10 px-3 py-1 [&_.breadcrumbs__link]:text-sm [&_.breadcrumbs__link]:font-medium [&_.breadcrumbs__link]:!text-primary [&_.breadcrumbs__separator]:!text-primary/50 [&_[data-current=true]]:!text-primary/60">
			{items.map((item) => (
				<BreadcrumbsItem
					key={`${item.label}-${item.href ?? "current"}`}
					href={item.href}
				>
					{item.href ? (
						item.label
					) : (
						<span
							className="inline-block max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap align-middle sm:max-w-[280px]"
							title={item.label}
						>
							{item.label}
						</span>
					)}
				</BreadcrumbsItem>
			))}
		</Breadcrumbs>
	);
}
