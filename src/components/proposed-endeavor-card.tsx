import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Chip } from "@nextui-org/react";

import type { ProposedEndeavor } from "@/types/content";

type ProposedEndeavorCardProps = {
  proposedEndeavor: ProposedEndeavor;
};

export function ProposedEndeavorCard({ proposedEndeavor }: ProposedEndeavorCardProps) {
  return (
    <Card
      isBlurred
      className="border border-default-200/80 bg-background/75 shadow-sm transition-all duration-300 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
    >
      <CardHeader className="flex flex-col items-start gap-4 px-6 py-6 sm:px-8 sm:py-8">
        <Chip
          classNames={{
            base: "border border-primary/20 bg-primary/10 text-primary",
            content: "font-medium uppercase tracking-[0.18em] text-[11px]",
          }}
          radius="full"
          size="sm"
          variant="flat"
        >
          {proposedEndeavor.sectionLabel}
        </Chip>
        <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {proposedEndeavor.title}
            </h2>
            <p className="text-default-700">{proposedEndeavor.summary}</p>
          </div>
          <div className="hidden h-3 w-3 shrink-0 rounded-full bg-primary/75 shadow-[0_0_24px_rgba(0,114,245,0.35)] lg:block" />
        </div>
      </CardHeader>
      <CardBody className="gap-6 px-6 pb-6 pt-0 sm:px-8 sm:pb-8">
        <div className="grid gap-3 md:grid-cols-3">
          {proposedEndeavor.pillars.map((pillar) => (
            <Card
              key={pillar}
              className="border border-default-200/70 bg-default-50/60 shadow-none dark:bg-default-100/5"
            >
              <CardBody className="gap-3 py-5">
                <div className="h-1 w-10 rounded-full bg-primary/70" />
                <p className="text-sm font-medium leading-6 text-default-700">{pillar}</p>
              </CardBody>
            </Card>
          ))}
        </div>
        <div>
          <Button
            as={Link}
            color="primary"
            href={proposedEndeavor.cta.href}
            radius="full"
            variant="flat"
          >
            {proposedEndeavor.cta.label}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
