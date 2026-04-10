/* eslint-disable @next/next/no-img-element */

import type { ComponentPropsWithoutRef } from "react";

import Link from "next/link";
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
  return <code {...props} className="rounded-md bg-default-100 px-1.5 py-0.5 text-sm" />;
}

function Heading(props: ComponentPropsWithoutRef<"h2">) {
  return <h2 {...props} className="mt-10 text-2xl font-semibold tracking-tight" />;
}

function Paragraph(props: ComponentPropsWithoutRef<"p">) {
  return <p {...props} className="mt-4 leading-7 text-default-700" />;
}

function UnorderedList(props: ComponentPropsWithoutRef<"ul">) {
  return <ul {...props} className="mt-4 list-disc space-y-2 pl-6 text-default-700" />;
}

function Anchor(props: ComponentPropsWithoutRef<"a">) {
  const href = props.href || "#";
  const isExternal = href.startsWith("http");

  if (isExternal) {
    return <a {...props} className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer" />;
  }

  return (
    <Link className="text-primary underline-offset-4 hover:underline" href={href}>
      {props.children}
    </Link>
  );
}

function MdxImage(props: ComponentPropsWithoutRef<"img">) {
  const src = typeof props.src === "string" ? props.src : undefined;

  return (
    <img
      {...props}
      alt={props.alt || ""}
      className="mt-6 rounded-2xl border border-default-200"
      src={withBasePath(src)}
    />
  );
}

export const mdxComponents = {
  a: Anchor,
  code: InlineCode,
  h2: Heading,
  img: MdxImage,
  p: Paragraph,
  pre: PreformattedCode,
  ul: UnorderedList,
};
