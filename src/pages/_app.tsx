import { AppProps } from 'next/app';
import { useEffect } from "react";
import { HeroUIProvider } from '@heroui/react'
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useTheme } from "next-themes";
import { fontSans, fontMono } from "@/config/fonts";
import { useRouter } from 'next/router';
import "@/styles/globals.css";
import 'animate.css';

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
