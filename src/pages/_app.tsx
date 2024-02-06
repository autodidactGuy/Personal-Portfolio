// pages/_app.js
import { AppProps } from 'next/app';

import {NextUIProvider} from '@nextui-org/react'
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { fontSans, fontMono } from "@/config/fonts";
import {useRouter} from 'next/router';
import "@/styles/globals.css";
import AnimatedCursor from 'react-animated-cursor';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

	return (
		<NextUIProvider navigate={router.push}>
			<NextThemesProvider>
				<AnimatedCursor
					color='255, 255, 255'
					innerSize={8}
					outerSize={35}
					innerScale={1}
					outerScale={1.7}
					outerAlpha={0.3}
					outerStyle={{
						mixBlendMode: 'exclusion'
					}}
					clickables={[
						'a',
						'input[type="text"]',
						'input[type="email"]',
						'input[type="number"]',
						'input[type="submit"]',
						'input[type="image"]',
						'label[for]',
						'select',
						'textarea',
						'button',
						'.link'
					]}
				/>
				<Component {...pageProps} />
			</NextThemesProvider>
		</NextUIProvider>
	);
}

export const fonts = {
	sans: fontSans.style.fontFamily,
	mono: fontMono.style.fontFamily,
};