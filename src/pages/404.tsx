import Link from "next/link";
import { siteConfig } from "@/config/site";
import DefaultLayout from "@/layouts/default";

export default function NotFoundPage() {
	return (
		<DefaultLayout
			seo={{
				title: "Page Not Found",
				description: `The page you're looking for doesn't exist on ${siteConfig.name}.`,
				noindex: true,
			}}
		>
			<section className="mx-auto flex max-w-3xl flex-col items-center justify-center py-24 text-center sm:py-32">
				<p className="text-6xl font-bold text-primary sm:text-8xl">404</p>
				<h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
					Page not found
				</h1>
				<p className="mt-4 max-w-md text-lg text-default-600">
					Sorry, the page you&apos;re looking for doesn&apos;t exist or has been
					moved.
				</p>
				<Link
					className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
					href="/"
				>
					Back to Home
				</Link>
			</section>
		</DefaultLayout>
	);
}
