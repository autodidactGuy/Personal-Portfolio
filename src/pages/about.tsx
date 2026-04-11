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
} from "@heroui/react";
import { BiSolidUserAccount } from "react-icons/bi";
import { FaUserGraduate } from "react-icons/fa6";
import { HiOutlineMapPin } from "react-icons/hi2";
import { MdWork } from "react-icons/md";
import { TbNotes } from "react-icons/tb";

import { siteConfig, withBasePath } from "@/config/site";
import { getAboutProfile, getEducation, getExperience } from "@/lib/content";
import { getAbsoluteImageUrl, getGeneratedPageOgImage, getPersonStructuredData, getSeoImage, getSiteUrl } from "@/lib/seo";
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

type ExperienceEntryCardProps = {
  title: string;
  company: string;
  companyComments?: string;
  location: string;
  duration: string;
  image: string;
  highlight: string;
  details: string[];
  tech: string[];
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
      className="border border-default-200/80 bg-content1/85 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 dark:bg-content1/72"
    >
      <CardBody className="gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex shrink-0 justify-center sm:block">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-default-200/80 bg-white p-3 shadow-sm">
              <Image
                as={NextImage}
                alt={subtitle}
                className="aspect-square h-12 w-12 object-contain"
                height={48}
                radius="none"
                src={withBasePath(image)}
                width={48}
              />
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <p className="text-xl font-semibold tracking-tight text-foreground">{title}</p>
                {badge ? (
                  <Chip
                    classNames={{
                      base: "border border-primary/20 bg-primary/10 text-primary",
                      content: "font-medium text-[11px]",
                    }}
                    radius="full"
                    size="sm"
                    variant="flat"
                  >
                    {badge}
                  </Chip>
                ) : null}
              </div>
              <div className="space-y-1 text-[15px] font-medium sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0">
                <p className="text-primary">{subtitle}</p>
                <span className="hidden text-default-300 sm:inline">•</span>
                <span className="inline-flex items-center justify-center gap-1 text-default-500 sm:justify-start">
                  <HiOutlineMapPin size={13} />
                  {meta}
                </span>
              </div>
              <p className="text-sm text-default-500">{detail}</p>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function ExperienceEntryCard({
  title,
  company,
  companyComments,
  location,
  duration,
  image,
  highlight,
  details,
  tech,
}: ExperienceEntryCardProps) {
  return (
    <Card className="border border-default-200/80 bg-content1/85 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 dark:bg-content1/72">
      <CardBody className="gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex shrink-0 justify-center sm:block">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-default-200/80 bg-white p-3 shadow-sm">
              <Image
                as={NextImage}
                alt={company}
                className="aspect-square h-12 w-12 object-contain"
                height={48}
                radius="none"
                src={withBasePath(image)}
                width={48}
              />
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <p className="text-xl font-semibold tracking-tight text-foreground">{title}</p>
                {companyComments ? (
                  <Chip
                    classNames={{
                      base: "border border-primary/20 bg-primary/10 text-primary",
                      content: "font-medium text-[11px]",
                    }}
                    radius="full"
                    size="sm"
                    variant="flat"
                  >
                    {companyComments}
                  </Chip>
                ) : null}
              </div>
              <div className="space-y-1 text-[15px] font-medium sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0">
                <p className="text-primary">{company}</p>
                <span className="hidden text-default-300 sm:inline">•</span>
                <span className="inline-flex items-center justify-center gap-1 text-default-500 sm:justify-start">
                  <HiOutlineMapPin size={13} />
                  {location}
                </span>
              </div>
              <p className="text-sm text-default-500">{duration}</p>
            </div>
          </div>
        </div>
        <div className="w-full">
            <Accordion
              className="w-full"
              itemClasses={{
                base: "border border-default-200/70 bg-content1/90 shadow-none dark:bg-content1/78",
                content: "px-4 pb-4 pt-0 sm:px-4 sm:pb-4",
                indicator: "text-primary",
                subtitle: "m-0 text-sm leading-6 text-default-600",
                title: "text-sm font-semibold text-foreground",
                titleWrapper: "min-h-0 gap-0",
                trigger: "px-4 py-3.5 sm:px-4 sm:py-3",
              }}
              selectionMode="multiple"
              variant="splitted"
            >
              <AccordionItem
                key={`${company}-${title}-details`}
                subtitle={<span className="hidden lg:block">{highlight}</span>}
                title={
                  <>
                    <span className="lg:hidden">View details</span>
                    {/* <span className="hidden lg:inline">Details</span> */}
                  </>
                }
              >
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-default-600 lg:hidden">{highlight}</p>
                  <ul className="space-y-2 text-sm leading-6 text-default-700">
                    {details.map((detail) => (
                      <li key={detail} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/65" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                  {tech.length ? (
                    <div className="flex flex-wrap gap-2">
                      {tech.map((item) => (
                        <Chip key={item} radius="full" size="sm" variant="flat">
                          {item}
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                </div>
              </AccordionItem>
            </Accordion>
          </div>
      </CardBody>
    </Card>
  );
}

function AboutAccordionIcon({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-10 w-10 shrink-0 self-center items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
      {children}
    </div>
  );
}
export default function About({ profile, experience, education }: AboutPageProps) {
  const pageDescription = profile.summary || siteConfig.description;

  return (
    <DefaultLayout
      seo={{
        title: `${profile.pageLabel}`,
        description: pageDescription,
        pathname: "/about",
        image: getSeoImage(profile.photo, getGeneratedPageOgImage("about")),
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
          className="animate__animated animate__fadeInUp overflow-hidden border border-default-200/80 bg-content1/85 shadow-sm shadow-primary/5 dark:bg-content1/72"
        >
          <CardBody className="gap-6 p-6 items-center text-center">
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
                    content: "font-medium uppercase tracking-[0.10em] text-[11px]",
                  }}
                  radius="full"
                  size="sm"
                  variant="flat"
                >
                  {profile.pageLabel}
                </Chip>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{siteConfig.name}</h1>
                <p className="text-sm font-medium tracking-[0.12em] text-default-500">
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
          <div className="space-y-4 px-5 sm:px-6">
            {/* <Chip
              classNames={{
                base: "border border-primary/20 bg-primary/10 text-primary",
                content: "font-medium uppercase tracking-[0.10em] text-[11px]",
              }}
              radius="full"
              size="sm"
              variant="flat"
            >
              {profile.pageLabel}
            </Chip> */}
            <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {profile.pageTitle}
            </h2>
            <p className="max-w-3xl text-base leading-8 text-default-600">
              {profile.pageDescription}
            </p>
          </div>

          <Accordion
            itemClasses={{
              base: "border border-default-200/80 bg-content1/85 shadow-sm dark:bg-content1/72",
              indicator: "text-primary",
              subtitle: "mt-2 text-default-500",
              title: "text-xl font-semibold tracking-tight",
              trigger: "items-center gap-4 px-5 py-5 sm:px-6",
              titleWrapper: "flex min-h-10 flex-col justify-center",
              content: "px-5 pb-5 pt-0 sm:px-6 sm:pb-6",
            }}
            selectionMode="multiple"
            variant="splitted"
          >
            <AccordionItem
              key="about"
              aria-label={profile.aboutSectionTitle}
              startContent={
                <AboutAccordionIcon>
                  <BiSolidUserAccount size={22} />
                </AboutAccordionIcon>
              }
              subtitle={profile.aboutSectionSubtitle}
              title={profile.aboutSectionTitle}
            >
              <div className="space-y-5">
                <div className="relative overflow-hidden rounded-3xl border border-default-200/70 bg-content1/85 p-5 shadow-sm shadow-primary/5 dark:bg-content1/72">
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary/80 via-primary/40 to-transparent" />
                  <div className="relative pl-1">
                    <div className="mb-3 flex items-center gap-3 text-primary">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10">
                        <TbNotes size={18} />
                      </div>
                      <p className="text-sm font-semibold tracking-[0.08em] text-foreground">{profile.summaryLabel}</p>
                    </div>
                    <p className="max-w-3xl text-[15px] leading-7 text-default-700">{profile.summary}</p>
                  </div>
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
              aria-label={profile.experienceTitle}
              startContent={
                <AboutAccordionIcon>
                  <MdWork size={22} />
                </AboutAccordionIcon>
              }
              subtitle={profile.experienceSubtitle}
              title={profile.experienceTitle}
            >
              <div className="space-y-4">
                {experience.map((item) => (
                  <ExperienceEntryCard
                    key={`${item.company}-${item.title}`}
                    company={item.company}
                    companyComments={item.companyComments || undefined}
                    details={item.details}
                    duration={`${item.from} - ${item.to}`}
                    highlight={item.highlight}
                    image={item.image}
                    location={item.location}
                    tech={item.tech}
                    title={item.title}
                  />
                ))}
              </div>
            </AccordionItem>

            <AccordionItem
              key="education"
              aria-label={profile.educationTitle}
              startContent={
                <AboutAccordionIcon>
                  <FaUserGraduate size={20} />
                </AboutAccordionIcon>
              }
              subtitle={profile.educationSubtitle}
              title={profile.educationTitle}
            >
              <div className="space-y-4">
                {education.map((item) => (
                  <AboutEntryCard
                    key={`${item.institute}-${item.degree}`}
                    badge={item.result}
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
