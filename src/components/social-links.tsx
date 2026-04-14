import { FaLinkedin, FaXTwitter } from "react-icons/fa6";
import { GithubIcon } from "@/components/icons";
import { siteConfig } from "@/config/site";

type SocialLinksProps = {
	className?: string;
	iconSize?: number;
};

export function SocialLinks({
	className = "",
	iconSize = 24,
}: SocialLinksProps) {
	return (
		<nav
			aria-label="Social links"
			className={`flex items-center gap-2 ${className}`.trim()}
		>
			<a
				aria-label="LinkedIn"
				href={siteConfig.links.linkedin}
				rel="noreferrer"
				target="_blank"
			>
				<FaLinkedin size={iconSize} />
			</a>
			<a
				aria-label="GitHub"
				href={siteConfig.links.github}
				rel="noreferrer"
				target="_blank"
			>
				<GithubIcon size={iconSize} />
			</a>
			<a
				aria-label="X"
				href={siteConfig.links.twitter}
				rel="noreferrer"
				target="_blank"
			>
				<FaXTwitter size={iconSize} />
			</a>
		</nav>
	);
}

export function SocialLinksCompact({ iconSize = 24 }: { iconSize?: number }) {
	return (
		<>
			<a
				aria-label="LinkedIn"
				href={siteConfig.links.linkedin}
				rel="noreferrer"
				target="_blank"
			>
				<FaLinkedin size={iconSize} />
			</a>
			<a
				aria-label="GitHub"
				href={siteConfig.links.github}
				rel="noreferrer"
				target="_blank"
			>
				<GithubIcon size={iconSize} />
			</a>
			<a
				aria-label="X"
				className="hidden xsm:block"
				href={siteConfig.links.twitter}
				rel="noreferrer"
				target="_blank"
			>
				<FaXTwitter size={iconSize} />
			</a>
		</>
	);
}
