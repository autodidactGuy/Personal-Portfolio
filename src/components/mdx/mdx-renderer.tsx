import { MDXRemote, type MDXRemoteSerializeResult } from "next-mdx-remote";

import { mdxComponents } from "@/components/mdx/mdx-components";

type MDXRendererProps = {
  source: MDXRemoteSerializeResult;
};

export function MDXRenderer({ source }: MDXRendererProps) {
  return <MDXRemote {...source} components={mdxComponents} />;
}
