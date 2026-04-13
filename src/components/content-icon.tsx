import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { MdMail } from "react-icons/md";

import { type ContentIconId, parseContentIconId } from "@/config/content-icons";

type ContentIconProps = {
	name?: ContentIconId | null;
	fallback?: ContentIconId;
	className?: string;
	size?: number;
};

const iconPackLoaders = {
	ai: () => import("react-icons/ai"),
	bi: () => import("react-icons/bi"),
	bs: () => import("react-icons/bs"),
	cg: () => import("react-icons/cg"),
	ci: () => import("react-icons/ci"),
	di: () => import("react-icons/di"),
	fa: () => import("react-icons/fa"),
	fa6: () => import("react-icons/fa6"),
	fc: () => import("react-icons/fc"),
	fi: () => import("react-icons/fi"),
	gi: () => import("react-icons/gi"),
	go: () => import("react-icons/go"),
	gr: () => import("react-icons/gr"),
	hi: () => import("react-icons/hi"),
	hi2: () => import("react-icons/hi2"),
	im: () => import("react-icons/im"),
	io: () => import("react-icons/io"),
	io5: () => import("react-icons/io5"),
	lia: () => import("react-icons/lia"),
	lu: () => import("react-icons/lu"),
	md: () => import("react-icons/md"),
	pi: () => import("react-icons/pi"),
	ri: () => import("react-icons/ri"),
	rx: () => import("react-icons/rx"),
	si: () => import("react-icons/si"),
	sl: () => import("react-icons/sl"),
	tb: () => import("react-icons/tb"),
	tfi: () => import("react-icons/tfi"),
	ti: () => import("react-icons/ti"),
	vsc: () => import("react-icons/vsc"),
	wi: () => import("react-icons/wi"),
} as const;

const loadedIconModules = new Map<string, Record<string, IconType>>();

function normalizeIconModule(
	iconModule: Record<string, unknown>,
): Record<string, IconType> {
	const normalizedEntries = Object.entries(iconModule).filter(
		([exportName, exportValue]) =>
			exportName !== "default" && typeof exportValue === "function",
	);

	return Object.fromEntries(normalizedEntries) as Record<string, IconType>;
}

async function loadIcon(iconId?: ContentIconId | null) {
	const parsedIcon = parseContentIconId(iconId);

	if (!parsedIcon) {
		return null;
	}

	const loadPack =
		iconPackLoaders[parsedIcon.pack as keyof typeof iconPackLoaders];

	if (!loadPack) {
		return null;
	}

	const cachedModule = loadedIconModules.get(parsedIcon.pack);

	if (cachedModule) {
		return cachedModule[parsedIcon.name] ?? null;
	}

	const iconModule = normalizeIconModule(await loadPack());
	loadedIconModules.set(parsedIcon.pack, iconModule);

	return iconModule[parsedIcon.name] ?? null;
}

export function ContentIcon({
	name,
	fallback = "md:MdMail",
	className,
	size = 20,
}: ContentIconProps) {
	const [Icon, setIcon] = useState<IconType | null>(null);

	useEffect(() => {
		let isMounted = true;

		loadIcon(name ?? fallback)
			.then((resolvedIcon) => {
				if (isMounted) {
					setIcon(() => resolvedIcon);
				}
			})
			.catch(() => {
				if (isMounted) {
					setIcon(null);
				}
			});

		return () => {
			isMounted = false;
		};
	}, [fallback, name]);

	const ResolvedIcon = Icon ?? MdMail;

	return <ResolvedIcon className={className} size={size} />;
}
