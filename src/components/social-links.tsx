import { Link } from "@heroui/react";
import { FaLinkedin, FaXTwitter } from "react-icons/fa6";

import { siteConfig } from "@/config/site";
import { GithubIcon } from "@/components/icons";

type SocialLinksProps = {
  className?: string;
  iconSize?: number;
};

export function SocialLinks({ className = "", iconSize = 24 }: SocialLinksProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <Link isExternal href={siteConfig.links.linkedin}>
        <FaLinkedin className="text-default-500" size={iconSize} />
      </Link>
      <Link isExternal href={siteConfig.links.github}>
        <GithubIcon className="text-default-500" size={iconSize} />
      </Link>
      <Link isExternal href={siteConfig.links.twitter}>
        <FaXTwitter className="text-default-500" size={iconSize} />
      </Link>
    </div>
  );
}

export function SocialLinksCompact({ iconSize = 24 }: { iconSize?: number }) {
  return (
    <>
      <Link isExternal href={siteConfig.links.linkedin}>
        <FaLinkedin className="text-default-500" size={iconSize} />
      </Link>
      <Link isExternal href={siteConfig.links.github}>
        <GithubIcon className="text-default-500" size={iconSize} />
      </Link>
      <Link isExternal className="hidden xsm:block" href={siteConfig.links.twitter}>
        <FaXTwitter className="text-default-500" size={iconSize} />
      </Link>
    </>
  );
}
