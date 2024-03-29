import React from "react";
import NextHead from "next/head";
import { basePath, siteConfig } from "@/config/site";

export const Head = () => {
	return (
		<NextHead>
			<title>{`${siteConfig.name} - ${siteConfig.slogan}`}</title>
			<meta key="title" content={`${siteConfig.name} - ${siteConfig.title} - ${siteConfig.slogan}`} property="og:title" />
			<meta content={siteConfig.description} property="og:description" />
			<meta content={siteConfig.description} name="description" />
			<meta
				key="viewport"
				content="viewport-fit=cover, width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
				name="viewport"
			/>
			<link href={`${basePath}/favicon.png`} rel="icon" sizes="16x16 32x32" type="image/png"/>
		</NextHead>
	);
};
