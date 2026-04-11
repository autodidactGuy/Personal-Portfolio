import { Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { HiMiniChatBubbleBottomCenterText } from "react-icons/hi2";

import type { Recommendations } from "@/types/content";

type RecommendationItem = Recommendations["items"][number];

type RecommendationCardProps = {
  recommendation: RecommendationItem;
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <Card
      className="border border-default-200/80 bg-content1/85 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 dark:bg-content1/72"
    >
      <CardHeader className="items-center justify-between gap-3 pb-0">
        <Chip
          classNames={{
            base: "border border-primary/20 bg-primary/10 text-primary",
            content: "font-medium uppercase tracking-[0.18em] text-[11px]",
          }}
          radius="full"
          size="sm"
          variant="flat"
        >
          {(recommendation.relationship || "Teammate & Collaborator").toUpperCase()}
        </Chip>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <HiMiniChatBubbleBottomCenterText size={16} />
        </div>
      </CardHeader>
      <CardBody className="gap-4 pt-4">
        <blockquote className="relative border-l-2 border-primary/20 pl-4 text-default-700">
          <span className="absolute -left-1 top-0 text-4xl leading-none text-primary/20">&ldquo;</span>
          <p className="relative text-[15px] leading-7 italic">{recommendation.quote}</p>
        </blockquote>
        <div>
          <p className="font-semibold">{recommendation.name}</p>
          <p className="text-sm text-default-500">{recommendation.role}</p>
        </div>
      </CardBody>
    </Card>
  );
}
