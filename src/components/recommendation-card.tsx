import { Card, CardContent, CardHeader } from "@heroui/react";
import { HiMiniChatBubbleBottomCenterText } from "react-icons/hi2";

import type { Recommendations } from "@/types/content";
import { AccentContentChip } from "./content-chip";

type RecommendationItem = Recommendations["items"][number];

type RecommendationCardProps = {
	recommendation: RecommendationItem;
};

export function RecommendationCard({
	recommendation,
}: RecommendationCardProps) {
	return (
		<Card className="border border-default-200/80 bg-content1/85 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 dark:bg-content1/72">
			<CardHeader className="flex flex-row items-start justify-between gap-3 pb-0">
				<AccentContentChip size="md">
					{(
						recommendation.relationship || "Teammate & Collaborator"
					).toUpperCase()}
				</AccentContentChip>
				<div className="shrink-0 rounded-full bg-primary/10 p-2 text-primary">
					<HiMiniChatBubbleBottomCenterText size={16} />
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<blockquote className="relative border-l-2 border-primary/20 pl-4 text-default-700">
					<span className="absolute -left-1 top-0 text-4xl leading-none text-primary/20">
						&ldquo;
					</span>
					<p className="relative text-[15px] leading-7 italic">
						{recommendation.quote}
					</p>
				</blockquote>
				<div>
					<p className="font-semibold">{recommendation.name}</p>
					<p className="text-sm text-default-500">{recommendation.role}</p>
				</div>
			</CardContent>
		</Card>
	);
}
