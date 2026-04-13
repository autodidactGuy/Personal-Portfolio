import { type SwitchProps, useSwitch } from "@heroui/react";
import { VisuallyHidden } from "@react-aria/visually-hidden";
import clsx from "clsx";
import { useTheme } from "next-themes";
import { type FC, useEffect, useState } from "react";

import { MoonFilledIcon, SunFilledIcon } from "@/components/icons";

export interface ThemeSwitchProps {
	className?: string;
	classNames?: SwitchProps["classNames"];
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({
	className,
	classNames,
}) => {
	const [isMounted, setIsMounted] = useState(false);

	const { resolvedTheme, theme, setTheme } = useTheme();
	const activeTheme = resolvedTheme || theme || "dark";

	const onChange = () => {
		activeTheme === "light" ? setTheme("dark") : setTheme("light");
	};

	const {
		Component,
		slots,
		isSelected,
		getBaseProps,
		getInputProps,
		getWrapperProps,
	} = useSwitch({
		isSelected: activeTheme === "light",
		onChange,
	});

	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Prevent Hydration Mismatch
	if (!isMounted) return <div className="w-6 h-6" />;

	return (
		<Component
			{...getBaseProps({
				"aria-label": "Toggle theme",
				className: clsx(
					"px-px transition-opacity hover:opacity-80 cursor-pointer",
					className,
					classNames?.base,
				),
			})}
		>
			<VisuallyHidden>
				<input {...getInputProps({ "aria-label": "Toggle theme" })} />
			</VisuallyHidden>
			<div
				{...getWrapperProps()}
				className={slots.wrapper({
					class: clsx(
						[
							"w-auto h-auto",
							"bg-transparent",
							"rounded-lg",
							"flex items-center justify-center",
							"group-data-[selected=true]:bg-transparent",
							"!text-default-500",
							"pt-px",
							"px-0",
							"mx-0",
						],
						classNames?.wrapper,
					),
				})}
			>
				{isSelected ? (
					<MoonFilledIcon size={22} />
				) : (
					<SunFilledIcon size={22} />
				)}
			</div>
		</Component>
	);
};
