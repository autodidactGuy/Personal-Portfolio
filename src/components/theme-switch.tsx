import clsx from "clsx";
import { useTheme } from "next-themes";
import { type FC, useEffect, useState } from "react";
import { MoonFilledIcon, SunFilledIcon } from "@/components/icons";

export interface ThemeSwitchProps {
	className?: string;
	classNames?: {
		base?: string;
		wrapper?: string;
	};
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({
	className,
	classNames,
}) => {
	const [isMounted, setIsMounted] = useState(false);
	const { resolvedTheme, theme, setTheme } = useTheme();
	const activeTheme = resolvedTheme || theme || "dark";
	const isLight = activeTheme === "light";

	useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!isMounted) {
		return <div className="h-6 w-6" />;
	}

	return (
		<button
			aria-label="Toggle theme"
			className={clsx(
				"cursor-pointer px-px transition-opacity hover:opacity-80",
				className,
				classNames?.base,
			)}
			onClick={() => setTheme(isLight ? "dark" : "light")}
			type="button"
		>
			<div
				className={clsx(
					"flex h-auto w-auto items-center justify-center rounded-lg bg-transparent pt-px",
					classNames?.wrapper,
				)}
			>
				{isLight ? <MoonFilledIcon size={22} /> : <SunFilledIcon size={22} />}
			</div>
		</button>
	);
};
