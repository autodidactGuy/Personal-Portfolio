import { Card, CardBody, CardHeader, Chip } from "@heroui/react";

import type { HomeStats } from "@/types/content";

type HomeStatsSectionProps = {
  stats: HomeStats;
};

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
            style={{ animationDelay: `${index * 120}ms`, animationFillMode: "both" }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute bottom-4 right-4 flex items-end gap-1.5 opacity-95">
                  <div className="h-4 w-2 rounded-full bg-primary/45 dark:bg-sky-300/70" />
                  <div className="h-8 w-2 rounded-full bg-primary/55 dark:bg-blue-300/78" />
                  <div className="h-12 w-2 rounded-full bg-primary/65 dark:bg-primary/85" />
                  <div className="h-7 w-2 rounded-full bg-primary/50 dark:bg-cyan-300/74" />
                  <div className="h-14 w-2 rounded-full bg-primary/75 dark:bg-primary/88" />
              </div>
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
