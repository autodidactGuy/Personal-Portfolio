import type { GetStaticProps } from "next";

import { FeaturedContentSection } from "@/components/featured-content-section";
import { FeaturedFocusCard } from "@/components/featured-focus-card";
import { HomeHeroSection } from "@/components/home-hero-section";
import { HomeStatsSection } from "@/components/home-stats-section";
import { RecommendationsSection } from "@/components/recommendations-section";
import { getFeaturedFocus, getFeaturedRecommendations, getHomeHero, getHomeStats, getPosts, getProjects } from "@/lib/content";
import DefaultLayout from "@/layouts/default";
import { PostContentTypeEnum, type ContentFrontmatter, type FeaturedFocus, type HomeHero, type HomeStats, type PostFrontmatter, type Recommendations } from "@/types/content";
import { toTitleCase } from "@/lib/string";

type HomePageProps = {
  hero: HomeHero;
  stats: HomeStats;
  featuredFocus: FeaturedFocus;
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
  featuredFocus,
  recommendations,
  featuredProjects,
  featuredPosts,
}: HomePageProps) {
  return (
    <DefaultLayout>
      <section className="mx-auto flex max-w-6xl flex-col gap-10 py-10 sm:py-24">
        <HomeHeroSection hero={hero} />

        <HomeStatsSection stats={stats} />

        <FeaturedFocusCard featuredFocus={featuredFocus} />

        <section className="grid gap-6 lg:grid-cols-2">
          <FeaturedContentSection
            actionHref="/projects"
            cardsClassName="space-y-4"
            items={featuredProjects}
            getHref={(slug) => `/project/${slug}`}
            title="Featured Projects"
            typeLabel={toTitleCase(PostContentTypeEnum.Project)}
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
  const featuredProjects = projects.filter((project) => project.frontmatter.featured).slice(0, 2);
  const featuredPosts = posts
    .filter((post) => post.frontmatter.featured && post.frontmatter.contentType !== PostContentTypeEnum.Project)
    .slice(0, 4);

  return {
    props: {
      hero: getHomeHero(),
      stats: getHomeStats(),
      featuredFocus: getFeaturedFocus(),
      recommendations: getFeaturedRecommendations(),
      featuredProjects,
      featuredPosts,
    },
  };
};
