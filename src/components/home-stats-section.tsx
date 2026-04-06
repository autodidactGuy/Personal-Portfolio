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
            className="animate__animated animate__fadeInUp group overflow-hidden border border-default-200/70 bg-background/75 shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
            style={{ animationDelay: `${index * 120}ms`, animationFillMode: "both" }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,114,245,0.08),_transparent_44%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_44%)]" />
              <div className="absolute inset-x-5 top-5 h-px bg-black/6 dark:bg-white/7" />
              <div className="absolute inset-x-5 top-9 h-px bg-black/4 dark:bg-white/5" />
              <div className="absolute bottom-4 right-4 h-20 w-24 overflow-hidden rounded-2xl border border-black/5 bg-black/[0.025] dark:border-white/8 dark:bg-white/[0.03]">
                <div className="absolute inset-x-3 bottom-4 h-px bg-black/8 dark:bg-white/10" />
                <div className="absolute bottom-4 left-3 flex items-end gap-1.5 opacity-70 dark:opacity-60">
                  <div className="h-4 w-2 rounded-full bg-primary/25" />
                  <div className="h-8 w-2 rounded-full bg-primary/35" />
                  <div className="h-12 w-2 rounded-full bg-primary/45" />
                  <div className="h-7 w-2 rounded-full bg-primary/30" />
                  <div className="h-14 w-2 rounded-full bg-primary/55" />
                </div>
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
              <p className="relative z-10 max-w-[12ch] text-xs font-medium uppercase tracking-[0.22em] text-default-500">
                {item.label}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
