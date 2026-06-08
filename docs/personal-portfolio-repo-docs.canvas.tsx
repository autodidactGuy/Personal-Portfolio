// @ts-nocheck
import {
	Button,
	Callout,
	Card,
	CardBody,
	CardHeader,
	Code,
	Divider,
	Grid,
	H1,
	H2,
	H3,
	Pill,
	Row,
	Spacer,
	Stack,
	Stat,
	Table,
	Text,
	useCanvasAction,
	useCanvasState,
	useHostTheme,
} from "cursor/canvas";

const sections = [
	{ id: "overview", label: "Overview" },
	{ id: "site", label: "Static Site" },
	{ id: "content", label: "Content" },
	{ id: "worker", label: "Worker" },
	{ id: "maintenance", label: "Maintenance" },
] as const;

type SectionId = (typeof sections)[number]["id"];

const repoStats = [
	{ value: "147", label: "workspace files inventoried" },
	{ value: "17", label: "Next.js page files" },
	{ value: "19", label: "content source files" },
	{ value: "10", label: "published MDX entries" },
	{ value: "5", label: "root generators" },
	{ value: "14", label: "worker source and test files" },
];

const sourceOfTruthRows = [
	[
		"Public identity, nav, social links",
		<Code key="site">content/settings/site.json</Code>,
		"Projected through siteConfig and used by SEO, nav, footer, assistant links, and generated assets.",
	],
	[
		"Content schemas",
		<Code key="types">src/types/content.ts</Code>,
		"Zod contract for JSON content, MDX frontmatter, resume payloads, and search index entries.",
	],
	[
		"Content loading and grouping",
		<Code key="content">src/lib/content.ts</Code>,
		"Reads disk content, validates schemas, filters unpublished entries, sorts by date, and splits project-like content from blog content.",
	],
	[
		"Theme tokens",
		<Code key="globals">src/styles/globals.css</Code>,
		"Single source for portfolio colors, HeroUI token mapping, dark theme variables, and page shell styling.",
	],
	[
		"Typography",
		<Code key="fonts">src/config/fonts.ts</Code>,
		"Single source for the sans and monospace stacks used by the app shell.",
	],
	[
		"SEO behavior",
		<Code key="seo">src/lib/seo.ts + src/layouts/head.tsx</Code>,
		"Builds canonical URLs, social images, robots intent, Open Graph tags, Twitter tags, and structured data output.",
	],
	[
		"Worker contracts",
		<Code key="worker">cloudflare-worker/src/index.ts</Code>,
		"Hono entrypoint for contact, Decap OAuth, assistant routing, raw provider debugging, and retrieval endpoints.",
	],
];

const routeRows = [
	[
		"/",
		"Homepage",
		"Hero, stats, featured focus, featured projects, recommendations, latest writing.",
	],
	[
		"/about",
		"Profile",
		"Profile JSON, experience, education, mobile accordion behavior, profile structured data.",
	],
	[
		"/resume",
		"Resume",
		"Resume-oriented view of profile, experience, education, PDF/link CTAs, profile SEO.",
	],
	[
		"/projects",
		"Projects listing",
		"Static paginated project and case-study archive with page size 20.",
	],
	[
		"/project/[slug]",
		"Project detail",
		"MDX detail page for project and case-study content, generated paths only.",
	],
	[
		"/blog",
		"Blog listing",
		"Static paginated listing for non-project content with page size 20.",
	],
	[
		"/blog/[slug]",
		"Blog detail",
		"MDX article page; project-like slugs canonicalize to /project and are noindexed here.",
	],
	[
		"/recommendations",
		"Recommendations",
		"Public recommendation cards sourced from content/recommendations/index.json.",
	],
	[
		"/contact",
		"Contact",
		"React Hook Form + Zod client validation, Turnstile, worker POST /contact, Calendly embed.",
	],
	[
		"/search",
		"Search",
		"Lazy loads public/search-index.json only after a query and groups results by content type.",
	],
	[
		"/docs/repo-canvas",
		"Canvas preview",
		"Noindex preview for docs/personal-portfolio-repo-docs.canvas.tsx using the src/cursor/canvas.tsx shim.",
	],
	["/admin", "Admin redirect", "Forwards editors toward the static Decap CMS admin surface."],
	["/404", "Not found", "Static fallback page for the exported app."],
];

const contentRows = [
	["content/home/*.json", "Homepage modules", "Hero, stats, and featured-focus content."],
	[
		"content/about/*.json",
		"About and resume modules",
		"Profile, experience, and education lists.",
	],
	[
		"content/settings/*.json",
		"Site and contact settings",
		"Identity, navigation, public links, coming-soon mode, contact copy.",
	],
	[
		"content/recommendations/index.json",
		"Recommendations",
		"Testimonials with role, relationship, quote, highlight, and optional links.",
	],
	[
		"content/posts/*.mdx",
		"Writing and work entries",
		"MDX body plus frontmatter: title, summary, date, contentType, tags, cover, featured, published.",
	],
];

const contentTypeRows = [
	[
		"project",
		"Project surface",
		"Included in /projects and /project/[slug]; also exported into resume.json projects.",
	],
	[
		"case-study",
		"Project surface",
		"Treated as project-like by the app; appears under /projects and /project/[slug].",
	],
	[
		"article",
		"Blog surface",
		"Included in /blog and /blog/[slug]; exported into resume.json articles.",
	],
	[
		"note, tutorial, announcement, news, other",
		"Blog surface",
		"Schema-supported post types that group with blog-like content.",
	],
];

const generatedRows = [
	[
		"yarn resume:generate",
		"public/api/resume.json",
		"Builds the assistant and public resume payload from content settings, profile, experience, education, recommendations, and posts.",
	],
	[
		"yarn search:generate",
		"public/search-index.json",
		"Builds static client search entries across about, experience, education, recommendations, projects, case studies, and articles.",
	],
	[
		"yarn seo:assets",
		"public/sitemap.xml + public/robots.txt",
		"Generates sitemap URLs and robots rules from site settings and published content.",
	],
	[
		"yarn seo:og",
		"public/og/*",
		"Generates page and post social preview images.",
	],
	[
		"yarn icons:generate",
		"src/generated/content-icons.json + public/cms-admin/content-icons.json",
		"Builds icon metadata for app rendering and CMS selection.",
	],
];

const workerEndpointRows = [
	[
		"GET /",
		"Debug home",
		"Interactive worker page for trying raw provider, semantic retrieval, routed assistant, and grounded RAG calls.",
	],
	[
		"POST /contact",
		"Contact delivery",
		"Allowed-origin check, honeypot, optional Turnstile, IP rate limit, Zod validation, Resend template send.",
	],
	[
		"GET /auth",
		"Decap OAuth start",
		"Validates origin, stores OAuth state and opener origin cookies, redirects to GitHub OAuth.",
	],
	[
		"GET /callback",
		"Decap OAuth finish",
		"Validates state, exchanges GitHub code, checks allowed GitHub users, posts the token back to Decap.",
	],
	[
		"POST /assistant",
		"Assistant proxy",
		"Validates chat or embeddings payloads and proxies to GitHub Models or Workers AI embeddings.",
	],
	[
		"POST /assistant-routed",
		"Routed assistant",
		"Tries provider priority with graceful fallback: Groq, Groq backup, Cloudflare, Hugging Face, GitHub Models, portfolio RAG.",
	],
	[
		"POST /assistant-provider-raw",
		"Provider debug",
		"Calls one configured provider directly for local debugging of raw provider behavior.",
	],
	[
		"POST /assistant-retrieve",
		"Semantic retrieval",
		"Embeds the query, searches Vectorize, loads chunks from R2, and returns matching chunks.",
	],
	[
		"POST /ask",
		"Grounded RAG",
		"Retrieves chunks and generates a structured answer through Workers AI with citations.",
	],
];

const assistantFlowRows = [
	["Build time", "content + resume generator", "public/api/resume.json"],
	["Worker deploy", "build-rag-dataset + ingest", "Vectorize vectors + R2 chunk records"],
	["Client question", "local guardrails + keyword retrieval", "high-signal snippets"],
	["Semantic retrieval", "POST /assistant-retrieve", "Vectorize/R2 matches"],
	["Answer generation", "POST /assistant-routed", "provider chain plus portfolio-RAG fallback"],
	["Display", "resume-assistant.tsx renderer", "citations, links, debug trail in development"],
];

const maintenanceRows = [
	[
		"Site source changes",
		"yarn lint, yarn typecheck, yarn build",
		"build also runs SEO assets, resume generation, search generation, and static export.",
	],
	[
		"Content or SEO input changes",
		"matching generator plus yarn build",
		"resume, search, sitemap, robots, and OG assets are derived artifacts.",
	],
	[
		"Worker behavior changes",
		"cd cloudflare-worker && yarn test && yarn typecheck",
		"worker tests cover contact, assistant, RAG, origin, and provider behavior.",
	],
	[
		"RAG deployment changes",
		"cd cloudflare-worker && yarn rag:build",
		"refreshes the resume payload, builds the RAG dataset, and ingests chunks/vectors.",
	],
	[
		"Architecture or ownership changes",
		"update repo-maintenance.md and repo-architecture-graph.md",
		"required when data flow, generated outputs, endpoints, env vars, or source-of-truth ownership move.",
	],
];

const knownDriftRows = [
	[
		"Case-study generated SEO",
		"App grouping treats case-study entries as project-like, but SEO and OG generators only special-case contentType === project.",
		"Review scripts/generate-seo-assets.mjs and scripts/generate-og-images.mjs so case studies generate /project paths and project OG assets.",
	],
	[
		"Workflow trigger docs",
		"README/docs describe push-triggered deploys, while deploy.yml and deploy-worker.yml currently have push triggers commented out.",
		"Either re-enable push triggers or update docs to describe workflow_dispatch-only deploys.",
	],
	[
		"Generated artifact presence",
		"Some documented generated outputs were not present during exploration: sitemap, OG assets, and generated content icon JSON.",
		"Run the matching generators before release if those artifacts are expected in the working tree.",
	],
	[
		"Worker README RAG notes",
		"Worker docs still mention older KV/small-embedding/topK settings, while current config uses R2, bge-base, topK 8, and maxContextChunks 10.",
		"Update cloudflare-worker/README.md when refreshing worker docs.",
	],
	[
		"CMS config naming",
		"Worker docs reference a CMS config.yml, but the repo currently carries public/cms-admin/config.template.yml.",
		"Clarify whether config.yml is generated at runtime or update the docs to name the template explicitly.",
	],
];

const keyFiles = [
	{ path: "docs/repo-maintenance.md", label: "Maintenance handbook" },
	{ path: "docs/repo-architecture-graph.md", label: "Architecture graph" },
	{ path: "README.md", label: "README" },
	{ path: "src/lib/content.ts", label: "Content loader" },
	{ path: "src/types/content.ts", label: "Content schemas" },
	{ path: "src/lib/seo.ts", label: "SEO helpers" },
	{ path: "src/components/resume-assistant.tsx", label: "Assistant UI" },
	{ path: "src/lib/resume-assistant.ts", label: "Assistant client logic" },
	{ path: "src/pages/docs/repo-canvas.tsx", label: "Canvas preview" },
	{ path: "src/cursor/canvas.tsx", label: "Canvas local shim" },
	{ path: "cloudflare-worker/src/index.ts", label: "Worker entrypoint" },
	{ path: "cloudflare-worker/wrangler.jsonc", label: "Worker bindings" },
];

function OpenFileButton({ path, label = "Open" }: { path: string; label?: string }) {
	const dispatch = useCanvasAction();

	return (
		<Button
			variant="ghost"
			onClick={() =>
				dispatch({
					type: "openFile",
					path,
				})
			}
		>
			{label}
		</Button>
	);
}

function SectionTabs({
	activeSection,
	setActiveSection,
}: {
	activeSection: SectionId;
	setActiveSection: (section: SectionId) => void;
}) {
	return (
		<Row gap={8} wrap>
			{sections.map((section) => (
				<Pill
					key={section.id}
					active={activeSection === section.id}
					onClick={() => setActiveSection(section.id)}
				>
					{section.label}
				</Pill>
			))}
		</Row>
	);
}

function Hero() {
	const theme = useHostTheme();

	return (
		<Card size="lg">
			<CardHeader trailing={<Pill active size="sm">static-first</Pill>}>
				Personal-Portfolio repository
			</CardHeader>
			<CardBody>
				<Grid columns="minmax(0, 1.2fr) minmax(260px, 0.8fr)" gap={20}>
					<Stack gap={12}>
						<H1>Repo Docs Canvas</H1>
						<Text tone="secondary">
							This repository is a static-first Next.js portfolio and publishing system paired with a Cloudflare Worker for server-only workflows: contact delivery, Decap CMS OAuth, assistant provider routing, and semantic retrieval.
						</Text>
						<Callout tone="info" title="Primary invariant">
							The root app exports static HTML. API-like data for the site is generated into <Code>public/</Code>, and true server behavior stays in the companion Worker.
						</Callout>
					</Stack>
					<div
						style={{
							border: `1px solid ${theme.stroke.secondary}`,
							borderRadius: 12,
							padding: 14,
							background: theme.fill.tertiary,
						}}
					>
						<Stack gap={8}>
							<Text weight="semibold">Current shape</Text>
							<Text size="small" tone="secondary">
								Next.js 15 pages router, React 19, Tailwind CSS 4, HeroUI, Zod 4, MDX, Biome, GitHub Pages, Cloudflare Workers, Vectorize, R2, and Workers AI.
							</Text>
							<Row gap={8} wrap>
								<Pill>static export</Pill>
								<Pill>content driven</Pill>
								<Pill>schema validated</Pill>
								<Pill>worker backed</Pill>
							</Row>
						</Stack>
					</div>
				</Grid>
			</CardBody>
		</Card>
	);
}

function OverviewSection() {
	return (
		<Stack gap={18}>
			<Hero />
			<Grid columns={3} gap={14}>
				{repoStats.map((stat) => (
					<Stat key={stat.label} value={stat.value} label={stat.label} />
				))}
			</Grid>

			<H2>System Map</H2>
			<Grid columns="1fr 1fr 1fr" gap={12}>
				<Card>
					<CardHeader>Static site</CardHeader>
					<CardBody>
						<Text size="small" tone="secondary">
							<Code>src/pages</Code> uses <Code>getStaticProps</Code> and <Code>getStaticPaths</Code> to render content-backed pages during <Code>next build</Code>.
						</Text>
					</CardBody>
				</Card>
				<Card>
					<CardHeader>Content and generators</CardHeader>
					<CardBody>
						<Text size="small" tone="secondary">
							<Code>content/</Code> feeds <Code>src/lib/content.ts</Code>, root scripts, SEO metadata, resume JSON, search JSON, and CMS configuration.
						</Text>
					</CardBody>
				</Card>
				<Card>
					<CardHeader>Cloudflare Worker</CardHeader>
					<CardBody>
						<Text size="small" tone="secondary">
							<Code>cloudflare-worker/src/index.ts</Code> owns runtime endpoints and isolates secrets from the static frontend.
						</Text>
					</CardBody>
				</Card>
			</Grid>

			<H2>Source Of Truth</H2>
			<Table
				headers={["Concern", "File", "Notes"]}
				rows={sourceOfTruthRows}
				striped
			/>

			<H2>Open Key Files</H2>
			<Grid columns={2} gap={10}>
				{keyFiles.map((file) => (
					<Row
						key={file.path}
						align="center"
						gap={10}
						style={{ minWidth: 0 }}
					>
						<Text truncate="start" style={{ minWidth: 0 }}>
							<Code>{file.path}</Code>
						</Text>
						<Spacer />
						<OpenFileButton path={file.path} label={file.label} />
					</Row>
				))}
			</Grid>
		</Stack>
	);
}

function StaticSiteSection() {
	return (
		<Stack gap={18}>
			<H2>Static Site</H2>
			<Text tone="secondary">
				The app uses the Next.js pages router with <Code>output: "export"</Code>, <Code>trailingSlash: true</Code>, optional base path support, unoptimized images, and no production Next.js API routes.
			</Text>

			<Grid columns={3} gap={14}>
				<Stat value="Next 15" label="pages router static export" />
				<Stat value="React 19" label="UI runtime" />
				<Stat value="HeroUI" label="component foundation" />
			</Grid>

			<Table
				headers={["Route", "Surface", "What it owns"]}
				rows={routeRows}
				striped
				stickyHeader
			/>

			<Grid columns="1fr 1fr" gap={14}>
				<Card>
					<CardHeader>Layout and theme</CardHeader>
					<CardBody>
						<Stack gap={8}>
							<Text size="small" tone="secondary">
								<Code>src/pages/_app.tsx</Code> installs <Code>next-themes</Code>, HeroUI toast provider, Animate.css, global CSS, and the font exports.
							</Text>
							<Text size="small" tone="secondary">
								<Code>src/layouts/default.tsx</Code> wraps pages with Head, AdminBar, Navbar, Footer, and the coming-soon gate.
							</Text>
							<Text size="small" tone="secondary">
								<Code>src/styles/globals.css</Code> maps portfolio variables into Tailwind and HeroUI theme tokens.
							</Text>
						</Stack>
					</CardBody>
				</Card>
				<Card>
					<CardHeader>Interactive frontend surfaces</CardHeader>
					<CardBody>
						<Stack gap={8}>
							<Text size="small" tone="secondary">
								<Code>src/components/resume-assistant.tsx</Code> renders the assistant drawer, persistence, citations, inline links, tables, and development debug panels.
							</Text>
							<Text size="small" tone="secondary">
								<Code>src/pages/contact.tsx</Code> handles form validation, honeypot, optional Turnstile, worker submission, toast feedback, and Calendly.
							</Text>
							<Text size="small" tone="secondary">
								<Code>src/pages/search.tsx</Code> lazy-loads the static search index after the user enters a query.
							</Text>
						</Stack>
					</CardBody>
				</Card>
			</Grid>
		</Stack>
	);
}

function ContentSection() {
	return (
		<Stack gap={18}>
			<H2>Content, SEO, And Generated Artifacts</H2>
			<Text tone="secondary">
				Content is authored as JSON and MDX, validated by Zod, loaded from disk at build time, and transformed into page props plus derived artifacts for static search, assistant context, SEO, CMS icons, and social previews.
			</Text>

			<Table headers={["Source", "Role", "Notes"]} rows={contentRows} striped />

			<Grid columns="1fr 1fr" gap={14}>
				<Card>
					<CardHeader>Grouping rules</CardHeader>
					<CardBody>
						<Table
							headers={["Content type", "Surface", "Behavior"]}
							rows={contentTypeRows}
							framed={false}
						/>
					</CardBody>
				</Card>
				<Card>
					<CardHeader>Published MDX inventory</CardHeader>
					<CardBody>
						<Stack gap={8}>
							<Text size="small" tone="secondary">
								Current content includes 3 project entries, 1 case study, and 6 articles. Every listed MDX entry is published.
							</Text>
							<Row gap={8} wrap>
								<Pill active>3 projects</Pill>
								<Pill active>1 case study</Pill>
								<Pill active>6 articles</Pill>
								<Pill>10 total MDX entries</Pill>
							</Row>
						</Stack>
					</CardBody>
				</Card>
			</Grid>

			<H3>Generated Artifact Map</H3>
			<Table
				headers={["Command", "Output", "Purpose"]}
				rows={generatedRows}
				striped
			/>

			<H3>SEO Flow</H3>
			<Callout tone="neutral" title="Metadata path">
				Page-level SEO objects flow into <Code>DefaultLayout</Code>, then <Code>Head</Code> calls <Code>buildSeo</Code> to normalize title, canonical URL, social image, robots intent, article metadata, and structured data.
			</Callout>
			<Row gap={10} wrap>
				<OpenFileButton path="src/lib/seo.ts" label="Open SEO helpers" />
				<OpenFileButton path="src/layouts/head.tsx" label="Open Head renderer" />
				<OpenFileButton path="scripts/generate-seo-assets.mjs" label="Open SEO generator" />
				<OpenFileButton path="scripts/generate-og-images.mjs" label="Open OG generator" />
			</Row>
		</Stack>
	);
}

function WorkerSection() {
	return (
		<Stack gap={18}>
			<H2>Cloudflare Worker</H2>
			<Text tone="secondary">
				The worker is the server boundary for everything the static app cannot do safely: OAuth token exchange, contact email delivery, provider calls, semantic retrieval, and RAG fallback generation.
			</Text>

			<Grid columns={4} gap={14}>
				<Stat value="Hono" label="routing layer" />
				<Stat value="Vectorize" label="semantic index" />
				<Stat value="R2" label="chunk records" />
				<Stat value="Workers AI" label="embeddings and RAG" />
			</Grid>

			<Table
				headers={["Endpoint", "Contract", "Behavior"]}
				rows={workerEndpointRows}
				striped
				stickyHeader
			/>

			<H3>Assistant Retrieval And Routing Flow</H3>
			<Table
				headers={["Stage", "Component", "Result"]}
				rows={assistantFlowRows}
				striped
			/>

			<Grid columns="1fr 1fr" gap={14}>
				<Card>
					<CardHeader>Bindings and vars</CardHeader>
					<CardBody>
						<Stack gap={8}>
							<Text size="small" tone="secondary">
								<Code>cloudflare-worker/wrangler.jsonc</Code> declares <Code>AI</Code>, <Code>VECTOR_INDEX</Code>, <Code>RAG_CHUNKS_BUCKET</Code>, allowed origins, contact addresses, provider priority, model defaults, and RAG tuning vars.
							</Text>
							<Text size="small" tone="secondary">
								Secrets are intentionally outside source: GitHub OAuth, GitHub Models, Groq, Hugging Face, Resend, Turnstile, Cloudflare account/API credentials, and R2 credentials.
							</Text>
						</Stack>
					</CardBody>
				</Card>
				<Card>
					<CardHeader>RAG ingestion</CardHeader>
					<CardBody>
						<Stack gap={8}>
							<Text size="small" tone="secondary">
								<Code>cloudflare-worker/scripts/build-rag-dataset.ts</Code> refreshes <Code>public/api/resume.json</Code>, folds in MDX sections, and emits <Code>.generated/portfolio-rag.json</Code>.
							</Text>
							<Text size="small" tone="secondary">
								<Code>cloudflare-worker/scripts/ingest.ts</Code> writes chunk records to R2 and vectors to Vectorize for retrieval at runtime.
							</Text>
						</Stack>
					</CardBody>
				</Card>
			</Grid>

			<Row gap={10} wrap>
				<OpenFileButton path="cloudflare-worker/src/index.ts" label="Open worker entry" />
				<OpenFileButton path="cloudflare-worker/src/rag/service.ts" label="Open RAG service" />
				<OpenFileButton path="cloudflare-worker/src/rag/retrieve.ts" label="Open retrieval" />
				<OpenFileButton path="cloudflare-worker/src/utils/providers.ts" label="Open providers" />
				<OpenFileButton path="cloudflare-worker/wrangler.jsonc" label="Open Wrangler config" />
			</Row>
		</Stack>
	);
}

function MaintenanceSection() {
	return (
		<Stack gap={18}>
			<H2>Maintenance Runbook</H2>
			<Text tone="secondary">
				The safest changes preserve static export, update schemas before content shape changes, regenerate derived artifacts when inputs move, and keep the Worker aligned with frontend contracts.
			</Text>

			<Table
				headers={["Change type", "Validation", "Why it matters"]}
				rows={maintenanceRows}
				striped
			/>

			<Grid columns="1fr 1fr" gap={14}>
				<Card>
					<CardHeader>Root commands</CardHeader>
					<CardBody>
						<Stack gap={8}>
							<Text><Code>yarn dev</Code> - regenerate resume/search artifacts, then start Next.js.</Text>
							<Text><Code>yarn lint</Code> - Biome check for app and worker source.</Text>
							<Text><Code>yarn typecheck</Code> - root TypeScript check.</Text>
							<Text><Code>yarn build</Code> - lint, SEO assets, resume JSON, search index, static export.</Text>
						</Stack>
					</CardBody>
				</Card>
				<Card>
					<CardHeader>Worker commands</CardHeader>
					<CardBody>
						<Stack gap={8}>
							<Text><Code>cd cloudflare-worker && yarn test</Code> - Vitest worker behavior checks.</Text>
							<Text><Code>cd cloudflare-worker && yarn typecheck</Code> - worker TypeScript check.</Text>
							<Text><Code>cd cloudflare-worker && yarn rag:build</Code> - build and ingest the RAG dataset.</Text>
							<Text><Code>cd cloudflare-worker && yarn deploy</Code> - build RAG data, then deploy with Wrangler.</Text>
						</Stack>
					</CardBody>
				</Card>
			</Grid>

			<Callout tone="warning" title="Derived artifacts">
				Do not hand-edit <Code>public/api/resume.json</Code>, <Code>public/search-index.json</Code>, <Code>public/sitemap.xml</Code>, <Code>public/robots.txt</Code>, <Code>public/og/*</Code>, or generated content icon JSON. Regenerate them from their source inputs.
			</Callout>

			<Callout tone="neutral" title="Documentation trigger">
				Update <Code>docs/repo-maintenance.md</Code> and <Code>docs/repo-architecture-graph.md</Code> whenever route ownership, content models, generated outputs, SEO behavior, worker endpoints, deployment, env vars, or source-of-truth ownership changes.
			</Callout>

			<H3>Known Drift From Repo Read</H3>
			<Table
				headers={["Area", "Finding", "Follow-up"]}
				rows={knownDriftRows}
				rowTone={["warning", "warning", "info", "warning", "info"]}
				striped
			/>
		</Stack>
	);
}

function ActiveSection({ section }: { section: SectionId }) {
	if (section === "site") {
		return <StaticSiteSection />;
	}

	if (section === "content") {
		return <ContentSection />;
	}

	if (section === "worker") {
		return <WorkerSection />;
	}

	if (section === "maintenance") {
		return <MaintenanceSection />;
	}

	return <OverviewSection />;
}

export default function PersonalPortfolioRepoDocsCanvas() {
	const [activeSection, setActiveSection] = useCanvasState<SectionId>(
		"active-section",
		"overview",
	);

	return (
		<Stack gap={18} style={{ padding: 24, maxWidth: 1180, margin: "0 auto" }}>
			<Row align="center" gap={12} wrap>
				<SectionTabs
					activeSection={activeSection}
					setActiveSection={setActiveSection}
				/>
				<Spacer />
				<OpenFileButton path="AGENTS.md" label="Open repo guide" />
			</Row>
			<Divider />
			<ActiveSection section={activeSection} />
		</Stack>
	);
}
