import dynamic from "next/dynamic";

import DefaultLayout from "@/layouts/default";

const RepoDocsCanvas = dynamic(
	() => import("../../../docs/personal-portfolio-repo-docs.canvas"),
	{
		ssr: false,
	},
);

export default function RepoCanvasPreviewPage() {
	return (
		<DefaultLayout
			seo={{
				title: "Repo Docs Canvas Preview",
				description:
					"Noindex preview of the repo-published Cursor canvas documentation source.",
				pathname: "/docs/repo-canvas",
				noindex: true,
			}}
		>
			<section className="mx-auto max-w-7xl py-8">
				<div className="mb-5 rounded-2xl border border-default-200/80 bg-content1/85 p-4 text-sm text-default-700 dark:bg-content1/72">
					<p>
						Preview for{" "}
						<code>docs/personal-portfolio-repo-docs.canvas.tsx</code>. The live
						Cursor canvas still renders in Cursor&apos;s canvas runtime; this
						page uses a small local compatibility shim at{" "}
						<code>src/cursor/canvas.tsx</code>.
					</p>
				</div>
				<RepoDocsCanvas />
			</section>
		</DefaultLayout>
	);
}
