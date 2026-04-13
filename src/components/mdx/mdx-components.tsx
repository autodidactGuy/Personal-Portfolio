import NextImage from "next/image";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { withBasePath } from "@/lib/base-path";

function PreformattedCode(props: ComponentPropsWithoutRef<"pre">) {
	return (
		<pre
			{...props}
			className="overflow-x-auto rounded-2xl border border-default-200 bg-default-100 p-4 text-sm"
		/>
	);
}

function InlineCode(props: ComponentPropsWithoutRef<"code">) {
	return (
		<code
			{...props}
			className="rounded-md bg-default-100 px-1.5 py-0.5 text-sm my-3"
		/>
	);
}

function HRDivider(props: ComponentPropsWithoutRef<"hr">) {
	return <hr {...props} className="my-3 border-default-200" />;
}

function Heading(props: ComponentPropsWithoutRef<"h2">) {
	return (
		<h2 {...props} className="mt-2 text-2xl font-semibold tracking-tight" />
	);
}

function HeadingH3(props: ComponentPropsWithoutRef<"h3">) {
	return (
		<h3 {...props} className="mt-2 text-lg font-semibold tracking-tight" />
	);
}

function Paragraph(props: ComponentPropsWithoutRef<"p">) {
	return <p {...props} className="mt-4 leading-7 text-default-700" />;
}

function UnorderedList(props: ComponentPropsWithoutRef<"ul">) {
	return (
		<ul {...props} className="mt-4 list-disc space-y-2 pl-6 text-default-700" />
	);
}

function Anchor(props: ComponentPropsWithoutRef<"a">) {
	const href = props.href || "#";
	const isExternal = href.startsWith("http");

	if (isExternal) {
		return (
			<a
				{...props}
				className="text-primary underline-offset-4 hover:underline"
				target="_blank"
				rel="noreferrer"
			/>
		);
	}

	return (
		<Link
			className="text-primary underline-offset-4 hover:underline"
			href={href}
		>
			{props.children}
		</Link>
	);
}

function MdxImage(props: ComponentPropsWithoutRef<"img">) {
	const src = typeof props.src === "string" ? props.src : undefined;
	const width =
		typeof props.width === "number" ? props.width : Number(props.width) || 1600;
	const height =
		typeof props.height === "number"
			? props.height
			: Number(props.height) || 900;
	const className = [
		"mt-6 h-auto max-w-full rounded-2xl border border-default-200",
		props.className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<NextImage
			alt={props.alt || ""}
			className={className}
			height={height}
			loading="lazy"
			sizes="(max-width: 768px) 100vw, 768px"
			src={withBasePath(src)}
			style={{ height: "auto", width: "100%" }}
			unoptimized
			width={width}
		/>
	);
}

export const mdxComponents = {
	a: Anchor,
	code: InlineCode,
	h2: Heading,
	h3: HeadingH3,
	hr: HRDivider,
	img: MdxImage,
	p: Paragraph,
	pre: PreformattedCode,
	ul: UnorderedList,
};
