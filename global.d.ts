declare module "*.css";

interface TurnstileInstance {
	render: (
		container: HTMLElement,
		options: {
			sitekey: string;
			callback?: (token: string) => void;
			"expired-callback"?: () => void;
		},
	) => string;
	reset: (widgetId: string) => void;
}

interface Window {
	turnstile?: TurnstileInstance;
}
