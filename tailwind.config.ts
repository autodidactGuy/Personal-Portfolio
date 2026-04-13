import { heroui } from "@heroui/react";

const config = {
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/**/*.{js,ts,jsx,tsx,mdx}",
		"./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			screens: {
				xsm: "400px",
			},
		},
	},
	darkMode: "class",
	plugins: [
		heroui({
			themes: {
				dark: {
					colors: {
						background: "#020617",
						foreground: "#e5e7eb",
						divider: "rgba(148, 163, 184, 0.18)",
						content1: {
							DEFAULT: "#0f172a",
							foreground: "#f8fafc",
						},
						content2: {
							DEFAULT: "#111827",
							foreground: "#f3f4f6",
						},
						content3: {
							DEFAULT: "#1f2937",
							foreground: "#e5e7eb",
						},
						content4: {
							DEFAULT: "#334155",
							foreground: "#e2e8f0",
						},
						default: {
							50: "#0f172a",
							100: "#111827",
							200: "#1f2937",
							300: "#334155",
							400: "#475569",
							500: "#64748b",
							600: "#94a3b8",
							700: "#cbd5e1",
							800: "#e2e8f0",
							900: "#f8fafc",
							DEFAULT: "#334155",
							foreground: "#f8fafc",
						},
					},
				},
			},
		}),
	],
};

export default config;
