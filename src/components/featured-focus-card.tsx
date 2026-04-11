import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Chip } from "@heroui/react";
import type { IconType } from "react-icons";
import {
  HiOutlineChartBarSquare,
  HiOutlineCpuChip,
  HiOutlineRocketLaunch,
} from "react-icons/hi2";

import type { FeaturedFocus } from "@/types/content";

type FeaturedFocusCardProps = {
  featuredFocus: FeaturedFocus;
};

const pillarIcons: IconType[] = [
  HiOutlineCpuChip,
  HiOutlineChartBarSquare,
  HiOutlineRocketLaunch,
];

export function FeaturedFocusCard({ featuredFocus }: FeaturedFocusCardProps) {
  return (
    <Card
      className="border border-default-200/80 bg-content1/85 shadow-sm transition-all duration-300 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 dark:bg-content1/72"
    >
      <CardHeader className="flex flex-col items-start gap-4 px-6 py-6 sm:px-8 sm:py-8">
        <Chip
          classNames={{
            base: "border border-primary/20 bg-primary/10 text-primary",
            content: "font-medium uppercase tracking-[0.10em] text-[11px]",
          }}
          radius="full"
          size="sm"
          variant="flat"
        >
          {featuredFocus.sectionLabel}
        </Chip>
        <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {featuredFocus.title}
            </h2>
            <p className="text-default-700">{featuredFocus.summary}</p>
          </div>
          {/* <div className="hidden h-3 w-3 shrink-0 rounded-full bg-primary/75 shadow-[0_0_24px_rgba(0,114,245,0.35)] lg:block" /> */}
        </div>
      </CardHeader>
      <CardBody className="gap-6 overflow-visible px-6 pb-6 pt-0 sm:px-8 sm:pb-8">
        <div className="grid gap-3 pt-1 md:grid-cols-3">
          {featuredFocus.pillars.map((pillar, index) => {
            const PillarIcon = pillarIcons[index % pillarIcons.length];

            return (
            <Card
              key={pillar}
              className="group h-full overflow-hidden border border-default-200/70 bg-content1/90 shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 dark:bg-content1/78"
            >
              <CardBody className="relative gap-4 p-5">
                <div className="relative z-10 flex items-center justify-between">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                    <PillarIcon size={16} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-default-400">
                    0{index + 1}
                  </span>
                </div>
                <div className="relative z-10 space-y-3">
                  <div className="h-px w-12 bg-gradient-to-r from-primary/70 via-primary/35 to-transparent transition-all duration-300 group-hover:w-20" />
                  <p className="text-sm font-medium leading-6 text-default-700">{pillar}</p>
                </div>
              </CardBody>
            </Card>
            );
          })}
        </div>
        <div>
          <Button
            as={Link}
            color="primary"
            href={featuredFocus.cta.href}
            radius="full"
            variant="flat"
          >
            {featuredFocus.cta.label}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
