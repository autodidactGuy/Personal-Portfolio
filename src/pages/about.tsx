import { Accordion, Card, CardContent, Chip } from "@heroui/react";
import type { GetStaticProps } from "next";
import NextImage from "next/image";
import type { ReactNode } from "react";
import { BiSolidUserAccount } from "react-icons/bi";
import { FaUserGraduate } from "react-icons/fa6";
import { HiOutlineMapPin } from "react-icons/hi2";
import { MdWork } from "react-icons/md";
import { TbNotes } from "react-icons/tb";

import { AccentContentChip } from "@/components/content-chip";
import { siteConfig, withBasePath } from "@/config/site";
import DefaultLayout from "@/layouts/default";
import { getAboutProfile, getEducation, getExperience } from "@/lib/content";
import {
	getAbsoluteImageUrl,
	getGeneratedPageOgImage,
	getPersonStructuredData,
	getSeoImage,
	getSiteUrl,
} from "@/lib/seo";
import type {
	AboutProfile,
	EducationItem,
	ExperienceItem,
} from "@/types/content";

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
		<Card className="border border-default-200/80 bg-content1/85 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 dark:bg-content1/72">
			<CardContent className="gap-5 p-5 sm:p-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div className="flex shrink-0 justify-center sm:block">
						<div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-default-200/80 bg-white p-3 shadow-sm">
							<NextImage
								alt={subtitle}
								className="aspect-square h-12 w-12 object-contain"
								height={48}
								src={withBasePath(image)}
								width={48}
							/>
						</div>
					</div>
					<div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
						<div className="space-y-0.5">
							<div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
								<p className="text-xl font-semibold tracking-tight text-foreground">
									{title}
								</p>
								{badge ? (
									<AccentContentChip size="md">{badge}</AccentContentChip>
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
			</CardContent>
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
			<CardContent className="gap-5 p-5 sm:p-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
					<div className="flex shrink-0 justify-center sm:block">
						<div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-default-200/80 bg-white p-3 shadow-sm">
							<NextImage
								alt={company}
								className="aspect-square h-12 w-12 object-contain"
								height={48}
								src={withBasePath(image)}
								width={48}
							/>
						</div>
					</div>
					<div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
						<div className="space-y-1">
							<div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
								<p className="text-xl font-semibold tracking-tight text-foreground">
									{title}
								</p>
								{companyComments ? (
									<AccentContentChip size="sm">
										{companyComments}
									</AccentContentChip>
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
					<Accordion className="w-full">
						<Accordion.Item
							className="overflow-hidden rounded-2xl border "
							id={`${company}-${title}-details`}
						>
							<Accordion.Heading>
								<Accordion.Trigger className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-default-100/45 dark:hover:bg-default-100/5">
									<div className="min-w-0">
										<span className="hidden lg:block">{highlight}</span>
										<span className="lg:hidden">View details</span>
									</div>
									<Accordion.Indicator className="shrink-0 text-primary" />
								</Accordion.Trigger>
							</Accordion.Heading>
							<Accordion.Panel>
								<Accordion.Body className="space-y-4 border-t border-default-200/50 px-4 pb-4 pt-4 dark:border-default-100/10">
									<p className="text-sm leading-6 text-default-600 lg:hidden">
										{highlight}
									</p>
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
												<Chip key={item}>{item}</Chip>
											))}
										</div>
									) : null}
								</Accordion.Body>
							</Accordion.Panel>
						</Accordion.Item>
					</Accordion>
				</div>
			</CardContent>
		</Card>
	);
}

function AboutAccordionIcon({ children }: { children: ReactNode }) {
	return (
		<div className="flex h-10 w-10 shrink-0 self-center items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
			{children}
		</div>
	);
}

type AboutSectionCardProps = {
	id: string;
	title: string;
	subtitle: string;
	icon: ReactNode;
	children: ReactNode;
	defaultExpanded?: boolean;
};

function AboutSectionCard({
	id,
	title,
	subtitle,
	icon,
	children,
	defaultExpanded = false,
}: AboutSectionCardProps) {
	return (
		<Accordion
			className="w-full"
			defaultExpandedKeys={defaultExpanded ? [id] : undefined}
			hideSeparator
		>
			<Accordion.Item
				className="overflow-hidden rounded-3xl border border-default-200/80 bg-content1/85 shadow-sm dark:bg-content1/72"
				id={id}
			>
				<Accordion.Heading>
					<Accordion.Trigger className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-default-100/35 sm:px-6 sm:py-6 dark:hover:bg-default-100/5">
						<div className="flex min-w-0 items-center gap-4">
							<AboutAccordionIcon>{icon}</AboutAccordionIcon>
							<div className="min-w-0">
								<h2 className="text-xl font-semibold tracking-tight">
									{title}
								</h2>
								<p className="mt-1 text-sm text-default-500">{subtitle}</p>
							</div>
						</div>
						<Accordion.Indicator className="shrink-0 text-primary" />
					</Accordion.Trigger>
				</Accordion.Heading>
				<Accordion.Panel>
					<Accordion.Body className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
						{children}
					</Accordion.Body>
				</Accordion.Panel>
			</Accordion.Item>
		</Accordion>
	);
}
export default function About({
	profile,
	experience,
	education,
}: AboutPageProps) {
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
				<Card className="p-0 animate__animated animate__fadeInUp overflow-hidden border border-default-200/80 bg-content1/85 shadow-sm shadow-primary/5 dark:bg-content1/72">
					<CardContent className="gap-6 p-6 items-center text-center">
						<div className="relative overflow-hidden rounded-3xl border border-default-200/80 bg-default-100/40">
							<div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent" />
							<NextImage
								alt={siteConfig.name}
								className="h-[300px] w-full object-cover"
								height={300}
								src={withBasePath(profile.photo)}
								width={320}
							/>
						</div>

						<div className="space-y-4 text-center">
							<div className="space-y-2">
								<AccentContentChip size="md">
									{profile.pageLabel.toUpperCase()}
								</AccentContentChip>
								<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
									{siteConfig.name}
								</h1>
								<p className="text-sm font-medium tracking-[0.12em] text-default-500">
									{siteConfig.title}
								</p>
							</div>

							<div className="h-px w-full bg-default-200/60" />

							<div className="space-y-3">
								<p className="text-lg font-medium leading-7 text-foreground">
									{profile.headline}
								</p>
								<p className="text-sm leading-7 text-default-600">
									{profile.summary}
								</p>
							</div>
						</div>
					</CardContent>
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

					<div className="space-y-4">
						<AboutSectionCard
							defaultExpanded
							icon={<BiSolidUserAccount size={22} />}
							id="about"
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
											<p className="text-sm font-semibold tracking-[0.08em] text-foreground">
												{profile.summaryLabel}
											</p>
										</div>
										<p className="max-w-3xl text-[15px] leading-7 text-default-700">
											{profile.summary}
										</p>
									</div>
								</div>
								<div className="space-y-4">
									{profile.body.map((paragraph) => (
										<p
											key={paragraph}
											className="text-[15px] leading-8 text-default-700 sm:text-base"
										>
											{paragraph}
										</p>
									))}
								</div>
							</div>
						</AboutSectionCard>

						<AboutSectionCard
							icon={<MdWork size={22} />}
							id="experience"
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
						</AboutSectionCard>

						<AboutSectionCard
							icon={<FaUserGraduate size={20} />}
							id="education"
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
						</AboutSectionCard>
					</div>
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
