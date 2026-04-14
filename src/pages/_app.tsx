import type { AppProps } from "next/app";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { fontMono, fontSans } from "@/config/fonts";
import "@/styles/globals.css";
import "animate.css";

export default function App({ Component, pageProps }: AppProps) {
	return (
		<NextThemesProvider
			attribute="class"
			defaultTheme="dark"
			disableTransitionOnChange
		>
			<div className="min-h-screen bg-background text-foreground">
				<Component {...pageProps} />
			</div>
		</NextThemesProvider>
	);
}

export const fonts = {
	sans: fontSans.style.fontFamily,
	mono: fontMono.style.fontFamily,
};
