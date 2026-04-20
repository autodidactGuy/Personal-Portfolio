const config = {
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			screens: {
				xsm: "400px",
			},
			keyframes: {
				spark: {
					"0%, 100%": { opacity: "0.3", transform: "scale(0.75)" },
					"50%": { opacity: "1", transform: "scale(1.15)" },
				},
			},
			animation: {
				spark: "spark 1.2s ease-in-out infinite",
				"spark-delay-1": "spark 1.2s ease-in-out 0.2s infinite",
				"spark-delay-2": "spark 1.2s ease-in-out 0.4s infinite",
			},
		},
	},
	darkMode: "class",
	plugins: [],
};

export default config;
