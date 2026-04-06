import NextImage from "next/image";
import Link from "next/link";
import { Image } from "@nextui-org/react";
import { button as buttonStyles } from "@nextui-org/theme";
import { FaLinkedin } from "react-icons/fa6";
import { IoDocument } from "react-icons/io5";
import { MdMail } from "react-icons/md";

import { siteConfig, withBasePath } from "@/config/site";
import { subtitle, title } from "@/components/primitives";
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
    <>
      <h1 className={title({ size: "lg" })}>{before}</h1>
      <h1 className={title({ color: "blue", size: "lg" })}>{highlightedText}</h1>
      <h1 className={title({ size: "lg" })}>{after}</h1>
    </>
  );
}

export function HomeHeroSection({ hero }: HomeHeroSectionProps) {
  return (
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
  );
}
