import type { GetStaticProps } from "next";

import Link from "next/link";
import { Button, Chip } from "@heroui/react";

import { RecommendationCard } from "@/components/recommendation-card";
import { siteConfig } from "@/config/site";
import { getRecommendations } from "@/lib/content";
import { getGeneratedPageOgImage, getSeoImage, getSiteUrl } from "@/lib/seo";
import DefaultLayout from "@/layouts/default";
import type { Recommendations } from "@/types/content";

type RecommendationsPageProps = {
  recommendations: Recommendations;
};

export default function RecommendationsPage({ recommendations }: RecommendationsPageProps) {
  const pageDescription =
    "Endorsements and working reflections that speak to technical execution, systems thinking, and cross-functional collaboration.";

  return (
    <DefaultLayout
      seo={{
        title: `${recommendations.title}`,
        description: pageDescription,
        pathname: "/recommendations",
        image: getSeoImage(siteConfig.avatar, getGeneratedPageOgImage("recommendations")),
        structuredData: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: recommendations.title,
          url: getSiteUrl("/recommendations"),
          description: pageDescription,
        },
      }}
    >
      <section className="mx-auto max-w-5xl py-10">
        <div className="mb-10 space-y-4">
          <Chip
            classNames={{
              base: "border border-primary/20 bg-primary/10 text-primary",
              content: "font-medium uppercase tracking-[0.10em] text-[11px]",
            }}
            radius="full"
            size="sm"
            variant="flat"
          >
            {recommendations.title}
          </Chip>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{recommendations.title}</h1>
              <p className="max-w-2xl text-default-700">
                Endorsements and working reflections that speak to technical execution, systems thinking, and cross-functional collaboration.
              </p>
            </div>
            {/* <Button as={Link} color="primary" href="/" radius="full" size="sm" variant="light">
              Back to home
            </Button> */}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:gap-6">
          {recommendations.items.map((recommendation) => (
            <RecommendationCard key={`${recommendation.name}-${recommendation.role}`} recommendation={recommendation} />
          ))}
        </div>
      </section>
    </DefaultLayout>
  );
}

export const getStaticProps: GetStaticProps<RecommendationsPageProps> = async () => {
  return {
    props: {
      recommendations: getRecommendations(),
    },
  };
};
