import { HomeSectionHeader } from "@/components/home-section-header";
import { RecommendationCard } from "@/components/recommendation-card";
import type { Recommendations } from "@/types/content";

type RecommendationsSectionProps = {
	recommendations: Recommendations;
};

export function RecommendationsSection({
	recommendations,
}: RecommendationsSectionProps) {
	return (
		<section className="space-y-4">
			<HomeSectionHeader
				actionHref="/recommendations"
				title={recommendations.title}
			/>
			{recommendations.items.map((recommendation) => (
				<RecommendationCard
					key={recommendation.name}
					recommendation={recommendation}
				/>
			))}
		</section>
	);
}
