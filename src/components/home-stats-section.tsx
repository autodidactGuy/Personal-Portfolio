import { Card, CardBody, CardHeader, Chip } from "@nextui-org/react";

import type { HomeStats } from "@/types/content";

type HomeStatsSectionProps = {
  stats: HomeStats;
};

export function HomeStatsSection({ stats }: HomeStatsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
          {stats.title}
        </p>
        <Chip
          classNames={{
            base: "border border-primary/20 bg-primary/10 text-primary",
            content: "font-medium uppercase tracking-[0.18em] text-[11px]",
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
            isBlurred
            className="animate__animated animate__fadeInUp group border border-default-200/70 bg-background/72 shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:bg-background/82"
            style={{ animationDelay: `${index * 120}ms`, animationFillMode: "both" }}
          >
            <CardHeader className="items-start justify-between pb-0 pt-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-default-400">
                0{index + 1}
              </span>
              <div className="h-2.5 w-2.5 rounded-full bg-primary/80 shadow-[0_0_18px_rgba(0,114,245,0.45)]" />
            </CardHeader>
            <CardBody className="relative gap-3 pb-5 pt-4">
              <p className="text-5xl font-semibold leading-none tracking-[-0.06em] text-foreground lg:text-6xl">
                {item.value}
              </p>
              <div className="h-px w-12 bg-gradient-to-r from-primary/60 to-transparent transition-all duration-300 group-hover:w-20" />
              <p className="max-w-[12ch] text-xs font-medium uppercase tracking-[0.22em] text-default-500">
                {item.label}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
