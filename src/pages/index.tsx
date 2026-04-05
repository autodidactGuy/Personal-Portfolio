import type { GetStaticProps } from "next";

import NextImage from "next/image";
import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Chip, Image } from "@nextui-org/react";
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
        <div className="animate__animated animate__fadeInUp grid items-center gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex justify-center">
            <Image
              as={NextImage}
              isBlurred
              alt={siteConfig.name}
              width={220}
              height={220}
              className="animate__animated animate__fadeInUp"
              src={withBasePath(hero.image)}
            />
          </div>
          <div className="text-center lg:text-left">
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
                  className="animate__animated animate__fadeInUp group border border-default-200/70 bg-background/72 shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:bg-background/82"
                  style={{ animationDelay: `${index * 120}ms`, animationFillMode: "both" }}
                >
                  <CardHeader className="items-start justify-between pb-0 pt-5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-default-400">
                      0{index + 1}
                    </span>
                    <div className="h-2.5 w-2.5 rounded-full bg-primary/80 shadow-[0_0_18px_rgba(0,114,245,0.45)]" />
                  </CardHeader>
                  <CardBody className="relative gap-3 pt-4 pb-5">
                    <p className="text-5xl font-semibold leading-none tracking-[-0.06em] text-foreground lg:text-6xl">
                      {item.value}
                    </p>
                    <div className="h-px w-12 bg-gradient-to-r from-primary/60 to-transparent transition-all duration-300 group-hover:w-20" />
                    <p className="max-w-[12ch] text-xs font-medium uppercase tracking-[0.22em] text-default-500">
                      {item.label}
                    </p>
                  </CardBody>
                </Card>
              ))}
          </div>
        </section>

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
              Featured Focus
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

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Featured Projects</h2>
              <Button as={Link} color="primary" href="/projects" radius="full" size="sm" variant="light">
                View all
              </Button>
            </div>
            {featuredProjects.map((project) => (
              <Card
                key={project.slug}
                isBlurred
                className="group border border-default-200/80 bg-background/75 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
              >
                <CardHeader className="items-start justify-between gap-3 pb-0">
                  <div className="space-y-2">
                    <Chip
                      classNames={{
                        base: "border border-primary/20 bg-primary/10 text-primary",
                        content: "font-medium uppercase tracking-[0.18em] text-[11px]",
                      }}
                      radius="full"
                      size="sm"
                      variant="flat"
                    >
                      Project
                    </Chip>
                    <p className="text-xl font-semibold tracking-tight">{project.frontmatter.title}</p>
                  </div>
                  <div className="h-2.5 w-2.5 rounded-full bg-primary/75 shadow-[0_0_18px_rgba(0,114,245,0.35)]" />
                </CardHeader>
                <CardBody className="gap-4 pt-3">
                  <p className="text-default-700">{project.frontmatter.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {project.frontmatter.tags.map((tag) => (
                      <Chip key={tag} radius="full" size="sm" variant="flat">
                        {tag}
                      </Chip>
                    ))}
                  </div>
                  <Button
                    as={Link}
                    className="w-fit font-medium transition-transform duration-300 group-hover:translate-x-0.5"
                    color="primary"
                    href={`/project/${project.slug}`}
                    radius="full"
                    variant="flat"
                  >
                    Read project
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{recommendations.title}</h2>
              <Button as={Link} color="primary" href="/blog" radius="full" size="sm" variant="light">
                Read blog
              </Button>
            </div>
            {recommendations.items.map((recommendation) => (
              <Card
                key={recommendation.name}
                isBlurred
                className="border border-default-200/80 bg-background/75 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
              >
                <CardHeader className="pb-0">
                  <Chip
                    classNames={{
                      base: "border border-primary/20 bg-primary/10 text-primary",
                      content: "font-medium uppercase tracking-[0.18em] text-[11px]",
                    }}
                    radius="full"
                    size="sm"
                    variant="flat"
                  >
                    Recommendation
                  </Chip>
                </CardHeader>
                <CardBody className="gap-3 pt-3">
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
            <Button as={Link} color="primary" href="/blog" radius="full" size="sm" variant="light">
              View all posts
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {featuredPosts.map((post) => (
              <Card
                key={post.slug}
                isBlurred
                className="group border border-default-200/80 bg-background/75 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5"
              >
                <CardHeader className="items-start justify-between gap-3 pb-0">
                  <div className="space-y-2">
                    <p className="text-sm uppercase tracking-[0.2em] text-primary">
                      {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xl font-semibold tracking-tight">{post.frontmatter.title}</p>
                  </div>
                  <div className="h-2.5 w-2.5 rounded-full bg-primary/75 shadow-[0_0_18px_rgba(0,114,245,0.35)]" />
                </CardHeader>
                <CardBody className="gap-4 pt-3">
                  <p className="text-sm uppercase tracking-[0.2em] text-primary">
                    Article
                  </p>
                  <p className="text-default-700">{post.frontmatter.summary}</p>
                  <Button
                    as={Link}
                    className="w-fit font-medium transition-transform duration-300 group-hover:translate-x-0.5"
                    color="primary"
                    href={`/blog/${post.slug}`}
                    radius="full"
                    variant="flat"
                  >
                    Read article
                  </Button>
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
