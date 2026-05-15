import { Card, CardContent, Chip } from "@heroui/react";
import type { GetStaticProps } from "next";
import NextImage from "next/image";
import Link from "next/link";
import { FaLinkedin } from "react-icons/fa6";
import { HiOutlineEnvelope, HiOutlineMapPin } from "react-icons/hi2";
import { IoDocumentTextOutline } from "react-icons/io5";

import { siteConfig, withBasePath } from "@/config/site";
import DefaultLayout from "@/layouts/default";
import { getAboutProfile, getEducation, getExperience } from "@/lib/content";
import {
	getGeneratedPageOgImage,
	getPersonId,
	getPersonStructuredData,
	getSeoImage,
	getSiteUrl,
	getWebsiteId,
} from "@/lib/seo";
import type {
	AboutProfile,
	EducationItem,
	ExperienceItem,
} from "@/types/content";

type ResumePageProps = {
	profile: AboutProfile;
	experience: ExperienceItem[];
	education: EducationItem[];
};

function formatDateRange(from: string, to: string) {
	return `${from} - ${to}`;
}

function ResumeSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-4">
			<div className="flex items-center gap-3">
				<div className="h-px flex-1 bg-default-200/70" />
				<h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-default-500">
					{title}
				</h2>
				<div className="h-px flex-1 bg-default-200/70" />
			</div>
			{children}
		</section>
	);
}

export default function ResumePage({
	profile,
	experience,
	education,
}: ResumePageProps) {
	const pageDescription =
		"Resume for Hassan Raza, a senior software engineer focused on fintech infrastructure, AI systems, distributed systems, payment platforms, and scalable data pipelines.";

	return (
		<DefaultLayout
			seo={{
				fullTitle: `Resume | ${siteConfig.name}`,
				description: pageDescription,
				pathname: "/resume",
				image: getSeoImage(profile.photo, getGeneratedPageOgImage("resume")),
				imageAlt: `${siteConfig.name} resume page`,
				type: "profile",
				structuredData: [
					getPersonStructuredData(),
					{
						"@context": "https://schema.org",
						"@type": "ProfilePage",
						name: `Resume | ${siteConfig.name}`,
						url: getSiteUrl("/resume"),
						description: pageDescription,
						isPartOf: {
							"@id": getWebsiteId(),
						},
						mainEntity: {
							"@id": getPersonId(),
						},
					},
					{
						"@context": "https://schema.org",
						"@type": "CollectionPage",
						name: `${siteConfig.name} Resume`,
						url: getSiteUrl("/resume"),
						description: pageDescription,
						about: {
							"@id": getPersonId(),
						},
						mainEntity: {
							"@type": "ItemList",
							itemListElement: experience.map((item, index) => ({
								"@type": "ListItem",
								position: index + 1,
								item: {
									"@type": "Thing",
									name: `${item.title} at ${item.company}`,
									description: item.highlight,
								},
							})),
						},
					},
				],
			}}
		>
			<section className="mx-auto max-w-5xl py-10">
				<Card className="overflow-hidden border border-default-200/80 bg-content1/85 shadow-sm shadow-primary/5 dark:bg-content1/72">
					<CardContent className="gap-8 p-6 sm:p-8">
						<div className="grid gap-6 lg:grid-cols-[350px_minmax(0,1fr)] lg:items-start">
							<div className="flex justify-center lg:justify-start">
								<div className="overflow-hidden rounded-3xl border border-default-200/80 bg-default-100/40">
									<NextImage
										alt={`${siteConfig.name} profile photo`}
										className="h-[440px] w-[350px] object-cover"
										height={440}
										src={withBasePath(profile.photo)}
										width={350}
									/>
								</div>
							</div>
							<div className="space-y-5">
								<div className="space-y-3">
									<Chip
										className="border border-primary/20 bg-primary/10 text-primary"
										size="sm"
										variant="soft"
									>
										Resume
									</Chip>
									<div className="space-y-2">
										<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
											{siteConfig.name}
										</h1>
										<p className="text-base font-medium uppercase tracking-[0.12em] text-default-500">
											{siteConfig.title}
										</p>
									</div>
									<p className="max-w-3xl text-base leading-8 text-default-700">
										{profile.summary}
									</p>
								</div>

								<div className="flex flex-wrap gap-2">
									{profile.industries.map((chip) => (
										<Chip key={chip}>{chip}</Chip>
									))}
								</div>

								<div className="flex flex-wrap gap-3">
									<a
										className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-white shadow-sm shadow-primary/15 transition-opacity hover:opacity-90"
										href={siteConfig.links.resume}
										rel="noreferrer"
										target="_blank"
									>
										<IoDocumentTextOutline size={18} />
										Download PDF
									</a>
									<a
										className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-default-200/80 bg-default px-4 text-sm font-medium text-default-foreground shadow-sm transition-colors hover:bg-default-hover dark:border-default-200/80 dark:bg-default dark:text-default-foreground dark:hover:bg-default-hover"
										href={siteConfig.links.linkedin}
										rel="noreferrer"
										target="_blank"
									>
										<FaLinkedin size={18} />
										LinkedIn
									</a>
									<Link
										className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-default-200/80 bg-default px-4 text-sm font-medium text-default-foreground shadow-sm transition-colors hover:bg-default-hover dark:border-default-200/80 dark:bg-default dark:text-default-foreground dark:hover:bg-default-hover"
										href="/contact"
									>
										<HiOutlineEnvelope size={18} />
										Contact
									</Link>
								</div>
							</div>
						</div>

						<div className="grid gap-10">
							<ResumeSection title="Summary">
								<div className="grid gap-4">
									{profile.body.map((paragraph) => (
										<p
											key={paragraph}
											className="text-[15px] leading-8 text-default-700"
										>
											{paragraph}
										</p>
									))}
								</div>
							</ResumeSection>

							<ResumeSection title="Experience">
								<div className="grid gap-4">
									{experience.map((item) => (
										<Card
											key={`${item.company}-${item.title}`}
											className="border border-default-200/80 bg-content1/80 shadow-sm dark:bg-content1/65"
										>
											<CardContent className="gap-4 p-5 sm:p-6">
												<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
													<div className="space-y-2">
														<div>
															<h2 className="text-xl font-semibold tracking-tight text-foreground">
																{item.title}
															</h2>
															<p className="text-base font-medium text-primary">
																{item.company}
															</p>
															{item.companyComments ? (
																<p className="text-sm text-default-500">
																	{item.companyComments}
																</p>
															) : null}
														</div>
													</div>
													<div className="space-y-1 text-sm text-default-500 sm:text-right">
														<p>{formatDateRange(item.from, item.to)}</p>
														<p>
															<HiOutlineMapPin
																size={13}
																style={{
																	display: "inline-block",
																	marginLeft: "5px",
																}}
															/>
															{item.location}
														</p>
													</div>
												</div>

												<p className="text-[15px] leading-7 text-default-700">
													{item.highlight}
												</p>
												<ul className="space-y-2 text-sm leading-7 text-default-700">
													{item.details.map((detail) => (
														<li key={detail} className="flex gap-2">
															<span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/65" />
															<span>{detail}</span>
														</li>
													))}
												</ul>

												<div className="flex flex-wrap gap-2">
													{item.tech.map((tech) => (
														<Chip key={tech}>{tech}</Chip>
													))}
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							</ResumeSection>

							<ResumeSection title="Education">
								<div className="grid gap-4 md:grid-cols-2">
									{education.map((item) => (
										<Card
											key={`${item.institute}-${item.degree}`}
											className="border border-default-200/80 bg-content1/80 shadow-sm dark:bg-content1/65"
										>
											<CardContent className="gap-4 p-5 sm:p-6">
												<div className="space-y-2">
													<h2 className="text-lg font-semibold tracking-tight text-foreground">
														{item.degree}
													</h2>
													<p className="text-base font-medium text-primary">
														{item.institute}
													</p>
												</div>
												<div className="space-y-1 text-sm text-default-500">
													<p>{formatDateRange(item.from, item.to)}</p>
													<p>{item.location}</p>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							</ResumeSection>
						</div>
					</CardContent>
				</Card>
			</section>
		</DefaultLayout>
	);
}

export const getStaticProps: GetStaticProps<ResumePageProps> = async () => {
	return {
		props: {
			profile: getAboutProfile(),
			experience: getExperience(),
			education: getEducation(),
		},
	};
};
