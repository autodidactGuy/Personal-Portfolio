import type { GetStaticProps } from "next";

import NextImage from "next/image";
import Link from "next/link";
import { Card, CardBody, Image } from "@nextui-org/react";
import { button as buttonStyles } from "@nextui-org/theme";
import { FaLinkedin } from "react-icons/fa6";
import { IoDocument } from "react-icons/io5";
import { MdMail } from "react-icons/md";

import { subtitle, title } from "@/components/primitives";
import { getAllPosts, getHomeHero, getHomeStats, getProjects, getProposedEndeavor, getRecommendations } from "@/lib/content";
import DefaultLayout from "@/layouts/default";
import { siteConfig, withBasePath } from "@/config/site";
import type { BlogFrontmatter, ContentFrontmatter, HomeHero, HomeStats, ProposedEndeavor, Recommendations } from "@/types/content";

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
    frontmatter: BlogFrontmatter;
  }>;
};

function renderHighlightedHeadline(headline: string, highlightedText: string) {
  const [before, after] = headline.split(highlightedText);

  if (!after) {
    return <h1 className={title({ size: "lg" })}>{headline}</h1>;
  }

  return (
    <>
      <h1 className={title({ size: "lg" })}>{before}</h1>
      <h1 className={title({ color: "blue", size: "lg" })}>{highlightedText}</h1>
      <h1 className={title({ size: "lg" })}>{after}</h1>
    </>
  );
}

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
        <div className="grid items-center gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Image
            as={NextImage}
            isBlurred
            alt={siteConfig.name}
            width={220}
            height={220}
            className="animate__animated animate__fadeInUp mx-auto"
            src={withBasePath(hero.image)}
          />
          <div className="animate__animated animate__fadeInUp text-center lg:text-left">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-primary">{hero.eyebrow}</p>
            <div className="space-y-2">{renderHighlightedHeadline(hero.headline, hero.highlightedText)}</div>
            <h4 className={subtitle({ class: "mt-4 max-w-3xl" })}>{hero.supportingText}</h4>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a
                className={buttonStyles({ variant: "bordered", radius: "full" })}
                href={siteConfig.links.linkedin}
                rel="noreferrer"
                target="_blank"
              >
                <FaLinkedin size={20} />
                LinkedIn
              </a>
              <a
                className={buttonStyles({ color: "primary", radius: "full", variant: "solid" })}
                href={withBasePath(hero.primaryCta.href)}
                rel={hero.primaryCta.external ? "noreferrer" : undefined}
                target={hero.primaryCta.external ? "_blank" : undefined}
              >
                <IoDocument size={20} />
                {hero.primaryCta.label}
              </a>
              <Link
                className={buttonStyles({ radius: "full", variant: "bordered" })}
                href={hero.secondaryCta.href}
              >
                <MdMail size={20} />
                {hero.secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          {stats.items.map((item) => (
            <Card key={item.label} className="border border-default-200 bg-background/70">
              <CardBody className="gap-1 text-center">
                <p className="text-3xl font-semibold text-primary">{item.value}</p>
                <p className="text-sm text-default-600">{item.label}</p>
              </CardBody>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 rounded-3xl border border-default-200 p-6 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Featured Focus</p>
            <h2 className="mt-3 text-3xl font-semibold">{proposedEndeavor.title}</h2>
            <p className="mt-4 text-default-700">{proposedEndeavor.summary}</p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-default-700">
              {proposedEndeavor.pillars.map((pillar) => (
                <li key={pillar}>{pillar}</li>
              ))}
            </ul>
          </div>
          <div className="flex items-end justify-start lg:justify-end">
            <Link className={buttonStyles({ color: "primary", radius: "full", variant: "flat" })} href={proposedEndeavor.cta.href}>
              {proposedEndeavor.cta.label}
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Featured Projects</h2>
              <Link className="text-sm font-medium text-primary" href="/projects">
                View all
              </Link>
            </div>
            {featuredProjects.map((project) => (
              <Card key={project.slug} className="border border-default-200">
                <CardBody className="gap-3">
                  <p className="text-xl font-semibold">{project.frontmatter.title}</p>
                  <p className="text-default-700">{project.frontmatter.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {project.frontmatter.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-default-100 px-3 py-1 text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Link className="text-sm font-medium text-primary" href={`/project/${project.slug}`}>
                    Read project
                  </Link>
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{recommendations.title}</h2>
              <Link className="text-sm font-medium text-primary" href="/blog">
                Read blog
              </Link>
            </div>
            {recommendations.items.map((recommendation) => (
              <Card key={recommendation.name} className="border border-default-200">
                <CardBody className="gap-2">
                  <p className="text-default-700">&ldquo;{recommendation.quote}&rdquo;</p>
                  <div>
                    <p className="font-semibold">{recommendation.name}</p>
                    <p className="text-sm text-default-500">{recommendation.role}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Latest Writing</h2>
            <Link className="text-sm font-medium text-primary" href="/blog">
              View all posts
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {featuredPosts.map((post) => (
              <Card key={post.slug} className="border border-default-200">
                <CardBody className="gap-3">
                  <p className="text-sm uppercase tracking-[0.2em] text-primary">
                    {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xl font-semibold">{post.frontmatter.title}</p>
                  <p className="text-default-700">{post.frontmatter.summary}</p>
                  <Link className="text-sm font-medium text-primary" href={`/blog/${post.slug}`}>
                    Read article
                  </Link>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      </section>
    </DefaultLayout>
  );
}

export const getStaticProps: GetStaticProps<HomePageProps> = async () => {
  const posts = getAllPosts();
  const projects = getProjects();

  return {
    props: {
      hero: getHomeHero(),
      stats: getHomeStats(),
      proposedEndeavor: getProposedEndeavor(),
      recommendations: getRecommendations(),
      featuredProjects: projects.filter((project) => project.frontmatter.featured).slice(0, 2),
      featuredPosts: posts.slice(0, 2),
    },
  };
};
