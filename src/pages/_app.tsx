import { HeroUIProvider } from "@heroui/react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect } from "react";
import { fontMono, fontSans } from "@/config/fonts";
import "@/styles/globals.css";
import "animate.css";

function ThemeDomSync() {
	const { resolvedTheme, theme } = useTheme();

	useEffect(() => {
		const activeTheme = resolvedTheme || theme;

		if (!activeTheme) {
			return;
		}

		document.documentElement.setAttribute("data-theme", activeTheme);
	}, [resolvedTheme, theme]);

	return null;
}

export default function App({ Component, pageProps }: AppProps) {
	const router = useRouter();

	return (
		<HeroUIProvider navigate={router.push}>
			<NextThemesProvider
				attribute="class"
				defaultTheme="dark"
				disableTransitionOnChange
			>
				<ThemeDomSync />
				<div className="min-h-screen bg-background text-foreground">
					<Component {...pageProps} />
				</div>
			</NextThemesProvider>
		</HeroUIProvider>
	);
}

export const fonts = {
	sans: fontSans.style.fontFamily,
	mono: fontMono.style.fontFamily,
};
