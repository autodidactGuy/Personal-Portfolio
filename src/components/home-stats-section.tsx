import { Card, CardBody, CardHeader, Chip } from "@heroui/react";

import type { HomeStats } from "@/types/content";

type HomeStatsSectionProps = {
	stats: HomeStats;
};

function isEvenCard(index: number) {
	return index % 2 === 0;
}

export function HomeStatsSection({ stats }: HomeStatsSectionProps) {
	return (
		<section className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm font-semibold uppercase tracking-[0.10em] text-primary">
					{stats.title}
				</p>
				<Chip
					classNames={{
						base: "border border-primary/20 bg-primary/10 text-primary",
						content: "font-medium uppercase tracking-[0.10em] text-[11px]",
					}}
					radius="full"
					size="sm"
					variant="flat"
				>
					{stats.badgeLabel}
				</Chip>
			</div>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{stats.items.map((item, index) => (
					<Card
						key={item.label}
						className="animate__animated animate__fadeInUp group overflow-hidden border border-default-200/70 bg-content1/85 shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 dark:bg-content1/72"
						style={{
							animationDelay: `${index * 120}ms`,
							animationFillMode: "both",
						}}
					>
						<div className="pointer-events-none absolute inset-0 overflow-hidden">
							{isEvenCard(index) ? (
								<div className="absolute bottom-4 right-4 flex items-end gap-1.5 opacity-95">
									<div className="h-4 w-2 rounded-full bg-primary/45 dark:bg-sky-300/70" />
									<div className="h-8 w-2 rounded-full bg-primary/55 dark:bg-blue-300/78" />
									<div className="h-12 w-2 rounded-full bg-primary/65 dark:bg-primary/85" />
									<div className="h-7 w-2 rounded-full bg-primary/50 dark:bg-cyan-300/74" />
									<div className="h-14 w-2 rounded-full bg-primary/75 dark:bg-primary/88" />
								</div>
							) : (
								<div className="absolute bottom-4 right-4 opacity-95">
									<svg
										aria-hidden="true"
										className="h-16 w-20"
										viewBox="0 0 80 64"
									>
										<path
											d="M8 52H70"
											fill="none"
											stroke="currentColor"
											strokeLinecap="round"
											strokeOpacity="0.22"
											strokeWidth="2"
											className="text-primary"
										/>
										<path
											d="M10 44L24 38L36 42L49 26L61 30L72 12"
											fill="none"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="3"
											className="text-primary dark:text-sky-300"
										/>
										<circle
											cx="24"
											cy="38"
											r="3"
											className="fill-primary/70 dark:fill-sky-300"
										/>
										<circle
											cx="36"
											cy="42"
											r="3"
											className="fill-primary/55 dark:fill-blue-300"
										/>
										<circle
											cx="49"
											cy="26"
											r="3"
											className="fill-primary/75 dark:fill-cyan-300"
										/>
										<circle
											cx="61"
											cy="30"
											r="3"
											className="fill-primary/60 dark:fill-indigo-300"
										/>
										<circle
											cx="72"
											cy="12"
											r="3.5"
											className="fill-primary dark:fill-primary"
										/>
									</svg>
								</div>
							)}
						</div>
						<CardHeader className="items-start justify-between pb-0 pt-5">
							<span className="relative z-10 text-[10px] font-semibold uppercase tracking-[0.32em] text-default-400">
								0{index + 1}
							</span>
							<div className="relative z-10 h-2.5 w-2.5 rounded-full bg-primary/80 shadow-[0_0_18px_rgba(0,114,245,0.45)]" />
						</CardHeader>
						<CardBody className="relative gap-3 pb-5 pt-4">
							<p className="relative z-10 text-5xl font-semibold leading-none tracking-[-0.06em] text-foreground lg:text-6xl">
								{item.value}
							</p>
							<div className="relative z-10 h-px w-12 bg-gradient-to-r from-primary/70 via-primary/40 to-transparent transition-all duration-300 group-hover:w-20" />
							<p className="relative z-10 max-w-[25ch] text-xs font-medium uppercase tracking-[0.10em] text-default-500">
								{item.label}
							</p>
						</CardBody>
					</Card>
				))}
			</div>
		</section>
	);
}
