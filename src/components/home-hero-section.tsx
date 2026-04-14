import NextImage from "next/image";
import Link from "next/link";
import { FaLinkedin } from "react-icons/fa6";
import { IoDocument, IoNewspaper } from "react-icons/io5";
import { subtitle, title } from "@/components/primitives";
import { siteConfig, withBasePath } from "@/config/site";
import type { HomeHero } from "@/types/content";

type HomeHeroSectionProps = {
	hero: HomeHero;
};

function renderHighlightedHeadline(headline: string, highlightedText: string) {
	const [before, after] = headline.split(highlightedText);

	if (!after) {
		return <h1 className={title({ size: "lg" })}>{headline}</h1>;
	}

	return (
		<h1 className="leading-tight">
			<span className={title({ size: "lg" })}>{before} </span>
			<span className={title({ color: "blue", size: "lg" })}>
				{highlightedText}
			</span>
			<span className={title({ size: "lg" })}> {after}</span>
		</h1>
	);
}
export function HomeHeroSection({ hero }: HomeHeroSectionProps) {
	return (
		<div className="animate__animated animate__fadeInUp grid items-center gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
			<div className="flex justify-center">
				<NextImage
					alt={siteConfig.name}
					className="animate__animated animate__fadeInUp "
					height={220}
					src={withBasePath(hero.image)}
					width={220}
				/>
			</div>
			<div className="text-center lg:text-left">
				<p className="mb-4 text-sm font-semibold uppercase tracking-[0.10em] text-primary">
					{hero.eyebrow}
				</p>
				<div className="space-y-2">
					{renderHighlightedHeadline(hero.headline, hero.highlightedText)}
				</div>
				<p className={subtitle({ class: "mt-4 max-w-3xl" })}>
					{hero.supportingText}
				</p>
				<div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
					<a
						className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-white shadow-sm shadow-primary/15 transition-opacity hover:opacity-90"
						href={withBasePath(hero.primaryCta.href)}
						rel={hero.primaryCta.external ? "noreferrer" : undefined}
						target={hero.primaryCta.external ? "_blank" : undefined}
					>
						<IoNewspaper size={20} />
						{hero.primaryCta.label}
					</a>
					<a
						className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-default-200/80 bg-default px-4 text-sm font-medium text-default-foreground shadow-sm transition-colors hover:bg-default-hover dark:border-default-200/80 dark:bg-default dark:text-default-foreground dark:hover:bg-default-hover"
						href={siteConfig.links.linkedin}
						rel="noreferrer"
						target="_blank"
					>
						<FaLinkedin size={20} />
						LinkedIn
					</a>
					<Link
						className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-default-200/80 bg-default px-4 text-sm font-medium text-default-foreground shadow-sm transition-colors hover:bg-default-hover dark:border-default-200/80 dark:bg-default dark:text-default-foreground dark:hover:bg-default-hover"
						href={hero.secondaryCta.href}
					>
						<IoDocument size={20} />
						{hero.secondaryCta.label}
					</Link>
				</div>
			</div>
		</div>
	);
}
