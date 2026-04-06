import type { GetStaticProps } from "next";

import { FeaturedContentSection } from "@/components/featured-content-section";
import { HomeHeroSection } from "@/components/home-hero-section";
import { HomeStatsSection } from "@/components/home-stats-section";
import { ProposedEndeavorCard } from "@/components/proposed-endeavor-card";
import { RecommendationsSection } from "@/components/recommendations-section";
import { getFeaturedRecommendations, getHomeHero, getHomeStats, getPosts, getProjects, getProposedEndeavor } from "@/lib/content";
import DefaultLayout from "@/layouts/default";
import type { ContentFrontmatter, HomeHero, HomeStats, PostFrontmatter, ProposedEndeavor, Recommendations } from "@/types/content";

type HomePageProps = {
  hero: HomeHero;
  stats: HomeStats;
  proposedEndeavor: ProposedEndeavor;
  recommendations: Recommendations;
  featuredProjects: Array<{
    slug: string;
    frontmatter: ContentFrontmatter;
  }>;
  featuredPosts: Array<{
    slug: string;
    frontmatter: PostFrontmatter;
  }>;
};

export default function IndexPage({
  hero,
  stats,
  proposedEndeavor,
  recommendations,
  featuredProjects,
  featuredPosts,
}: HomePageProps) {
  return (
    <DefaultLayout>
      <section className="mx-auto flex max-w-6xl flex-col gap-10 py-10 sm:py-24">
        <HomeHeroSection hero={hero} />

        <HomeStatsSection stats={stats} />

        <ProposedEndeavorCard proposedEndeavor={proposedEndeavor} />

        <section className="grid gap-6 lg:grid-cols-2">
          <FeaturedContentSection
            actionHref="/projects"
            cardsClassName="space-y-4"
            items={featuredProjects}
            getHref={(slug) => `/project/${slug}`}
            title="Featured Projects"
            typeLabel="Project"
          />

          <RecommendationsSection recommendations={recommendations} />
        </section>

        <FeaturedContentSection
          actionHref="/blog"
          actionLabel="View all posts"
          getHref={(slug) => `/blog/${slug}`}
          items={featuredPosts}
          sectionClassName="space-y-4"
          showMeta
          title="Latest Writing"
        />
      </section>
    </DefaultLayout>
  );
}

export const getStaticProps: GetStaticProps<HomePageProps> = async () => {
  const posts = getPosts();
  const projects = getProjects();

  return {
    props: {
      hero: getHomeHero(),
      stats: getHomeStats(),
      proposedEndeavor: getProposedEndeavor(),
      recommendations: getFeaturedRecommendations(),
      featuredProjects: projects.filter((project) => project.frontmatter.featured).slice(0, 2),
      featuredPosts: posts.slice(0, 2),
    },
  };
};
