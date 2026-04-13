import { Link } from "@heroui/react";
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
		<div className={`flex items-center gap-2 ${className}`.trim()}>
			<Link aria-label="LinkedIn" isExternal href={siteConfig.links.linkedin}>
				<FaLinkedin className="text-default-500" size={iconSize} />
			</Link>
			<Link aria-label="GitHub" isExternal href={siteConfig.links.github}>
				<GithubIcon className="text-default-500" size={iconSize} />
			</Link>
			<Link aria-label="X" isExternal href={siteConfig.links.twitter}>
				<FaXTwitter className="text-default-500" size={iconSize} />
			</Link>
		</div>
	);
}

export function SocialLinksCompact({ iconSize = 24 }: { iconSize?: number }) {
	return (
		<>
			<Link aria-label="LinkedIn" isExternal href={siteConfig.links.linkedin}>
				<FaLinkedin className="text-default-500" size={iconSize} />
			</Link>
			<Link aria-label="GitHub" isExternal href={siteConfig.links.github}>
				<GithubIcon className="text-default-500" size={iconSize} />
			</Link>
			<Link
				aria-label="X"
				isExternal
				className="hidden xsm:block"
				href={siteConfig.links.twitter}
			>
				<FaXTwitter className="text-default-500" size={iconSize} />
			</Link>
		</>
	);
}
