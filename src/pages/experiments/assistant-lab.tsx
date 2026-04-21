import type { GetStaticProps } from "next";
import { ExperimentalAssistantLab } from "@/components/experimental-assistant/assistant-lab";
import DefaultLayout from "@/layouts/default";
import { getGeneratedPageOgImage, getSeoImage } from "@/lib/seo";

export default function ExperimentalAssistantLabPage() {
	return (
		<DefaultLayout
			seo={{
				title: "Experimental Assistant Lab",
				description:
					"Local-only testbed for embeddings-first retrieval and optional Hugging Face synthesis.",
				pathname: "/experiments/assistant-lab",
				image: getSeoImage(getGeneratedPageOgImage("projects")),
			}}
		>
			<ExperimentalAssistantLab />
		</DefaultLayout>
	);
}

export const getStaticProps: GetStaticProps = async () => {
	if (process.env.NODE_ENV !== "development") {
		return {
			notFound: true,
		};
	}

	return {
		props: {},
	};
};
