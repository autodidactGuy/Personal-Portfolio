import type { GetStaticProps } from "next";

import NextImage from "next/image";
import {
  Accordion,
  AccordionItem,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Image,
} from "@nextui-org/react";
import { BiSolidUserAccount } from "react-icons/bi";
import { FaUserGraduate } from "react-icons/fa6";
import { HiOutlineMapPin, HiOutlineSparkles } from "react-icons/hi2";
import { MdWork } from "react-icons/md";

import { siteConfig, withBasePath } from "@/config/site";
import { getAboutProfile, getEducation, getExperience } from "@/lib/content";
import { getAbsoluteImageUrl, getPersonStructuredData, getSeoImage, getSiteUrl } from "@/lib/seo";
import DefaultLayout from "@/layouts/default";
import type { AboutProfile, EducationItem, ExperienceItem } from "@/types/content";

type AboutPageProps = {
  profile: AboutProfile;
  experience: ExperienceItem[];
  education: EducationItem[];
};

type AboutEntryCardProps = {
  title: string;
  subtitle: string;
  detail: string;
  meta: string;
  image: string;
  badge?: string;
};

function AboutEntryCard({
  title,
  subtitle,
  detail,
  meta,
  image,
  badge,
}: AboutEntryCardProps) {
  return (
    <Card
      isBlurred
      className="border border-default-200/80 bg-background/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
    >
      <CardBody className="gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex shrink-0 justify-center sm:block">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-default-200/80 bg-white p-2 shadow-sm dark:bg-default-50/5">
              <Image
                as={NextImage}
                alt={subtitle}
                className="h-10 w-10 object-contain"
                height={40}
                radius="none"
                src={withBasePath(image)}
                width={40}
              />
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xl font-semibold tracking-tight text-foreground">{title}</p>
                {badge ? (
                  <Chip
                    classNames={{
                      base: "border border-primary/20 bg-primary/10 text-primary",
                      content: "font-medium uppercase tracking-[0.18em] text-[10px]",
                    }}
                    radius="full"
                    size="sm"
                    variant="flat"
                  >
                    {badge}
                  </Chip>
                ) : null}
              </div>
              <p className="text-base font-medium text-primary">{subtitle}</p>
              <p className="text-sm text-default-500">{detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                radius="full"
                size="sm"
                startContent={<HiOutlineMapPin size={12} />}
                variant="flat"
              >
                {meta}
              </Chip>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function About({ profile, experience, education }: AboutPageProps) {
  const pageDescription = profile.summary || siteConfig.description;

  return (
    <DefaultLayout
      seo={{
        title: "About",
        description: pageDescription,
        pathname: "/about",
        image: getSeoImage(profile.photo),
        type: "profile",
        structuredData: [
          getPersonStructuredData(),
          {
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            name: `About ${siteConfig.name}`,
            url: getSiteUrl("/about"),
            description: pageDescription,
            mainEntity: {
              "@type": "Person",
              name: siteConfig.name,
              image: getAbsoluteImageUrl(profile.photo),
              description: pageDescription,
            },
          },
        ],
      }}
    >
      <section className="mx-auto flex max-w-6xl flex-col gap-8 py-10 sm:py-14 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <Card
          isBlurred
          className="animate__animated animate__fadeInUp overflow-hidden border border-default-200/80 bg-background/80 shadow-sm shadow-primary/5"
        >
          <CardBody className="gap-6 p-6">
            <div className="relative overflow-hidden rounded-3xl border border-default-200/80 bg-default-100/40">
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent" />
              <Image
                as={NextImage}
                alt={siteConfig.name}
                className="h-[300px] w-full object-cover"
                height={300}
                radius="none"
                src={withBasePath(profile.photo)}
                width={320}
              />
            </div>

            <div className="space-y-4 text-center">
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
                  About
                </Chip>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{siteConfig.name}</h1>
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-default-500">
                  {siteConfig.title}
                </p>
              </div>

              <Divider className="opacity-60" />

              <div className="space-y-3">
                <p className="text-lg font-medium leading-7 text-foreground">{profile.headline}</p>
                <p className="text-sm leading-7 text-default-600">{profile.summary}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-5">
          <div className="space-y-3">
            <Chip
              classNames={{
                base: "border border-primary/20 bg-primary/10 text-primary",
                content: "font-medium uppercase tracking-[0.18em] text-[11px]",
              }}
              radius="full"
              size="sm"
              variant="flat"
            >
              Professional Profile
            </Chip>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Product-minded engineering with systems depth
            </h2>
            <p className="max-w-3xl text-default-700">
              The focus here is not only what I have built, but how I think about scale, communication,
              and durable software design across teams and products.
            </p>
          </div>

          <Accordion
            itemClasses={{
              base: "border border-default-200/80 bg-background/80 shadow-sm",
              indicator: "text-primary",
              subtitle: "mt-2 text-default-500",
              title: "text-xl font-semibold tracking-tight",
              trigger: "px-5 py-5 sm:px-6",
              content: "px-5 pb-5 pt-0 sm:px-6 sm:pb-6",
            }}
            selectionMode="multiple"
            variant="splitted"
          >
            <AccordionItem
              key="about"
              aria-label="About Me"
              startContent={<BiSolidUserAccount className="text-primary" size={28} />}
              subtitle="Background, perspective, and the kind of engineering problems I enjoy solving."
              title="About Me"
            >
              <div className="space-y-5">
                <div className="rounded-2xl border border-default-200/70 bg-default-50/55 p-5 dark:bg-default-100/5">
                  <div className="mb-4 flex items-center gap-2 text-primary">
                    <HiOutlineSparkles size={18} />
                    <p className="text-sm font-semibold uppercase tracking-[0.18em]">Snapshot</p>
                  </div>
                  <p className="text-[15px] leading-8 text-default-700">{profile.summary}</p>
                </div>
                <div className="space-y-4">
                  {profile.body.map((paragraph) => (
                    <p key={paragraph} className="text-[15px] leading-8 text-default-700 sm:text-base">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </AccordionItem>

            <AccordionItem
              key="experience"
              aria-label="Experience"
              startContent={<MdWork className="text-primary" size={28} />}
              subtitle="Roles across product, platform, and delivery-focused teams."
              title="Experience"
            >
              <div className="space-y-4">
                {experience.map((item) => (
                  <AboutEntryCard
                    key={`${item.company}-${item.title}`}
                    badge={item.companyComments || undefined}
                    detail={`${item.from} - ${item.to}`}
                    image={item.image}
                    meta={item.location}
                    subtitle={item.company}
                    title={item.title}
                  />
                ))}
              </div>
            </AccordionItem>

            <AccordionItem
              key="education"
              aria-label="Education"
              startContent={<FaUserGraduate className="text-primary" size={28} />}
              subtitle="Academic foundation in computer science with strong outcomes."
              title="Education"
            >
              <div className="space-y-4">
                {education.map((item) => (
                  <AboutEntryCard
                    key={`${item.institute}-${item.degree}`}
                    badge={`GPA ${item.result}`}
                    detail={`${item.from} - ${item.to}`}
                    image={item.image}
                    meta={item.location}
                    subtitle={item.institute}
                    title={item.degree}
                  />
                ))}
              </div>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </DefaultLayout>
  );
}

export const getStaticProps: GetStaticProps<AboutPageProps> = async () => {
  return {
    props: {
      profile: getAboutProfile(),
      experience: getExperience(),
      education: getEducation(),
    },
  };
};
