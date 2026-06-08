import type { CSSProperties, ReactNode } from "react";
import { isValidElement, useEffect, useState } from "react";

type LayoutProps = {
	children?: ReactNode;
	gap?: number;
	style?: CSSProperties;
};

type RowProps = LayoutProps & {
	align?: "start" | "center" | "end" | "stretch";
	justify?: "start" | "center" | "end" | "space-between";
	wrap?: boolean;
};

type GridProps = LayoutProps & {
	columns: number | string;
	align?: "start" | "center" | "end" | "stretch";
};

type TextProps = {
	children?: ReactNode;
	tone?: "primary" | "secondary" | "tertiary" | "quaternary";
	size?: "body" | "small";
	as?: "p" | "span";
	weight?: "normal" | "medium" | "semibold" | "bold";
	italic?: boolean;
	truncate?: boolean | "start" | "end";
	style?: CSSProperties;
};

type CardProps = {
	children?: ReactNode;
	size?: "base" | "lg";
	variant?: "default" | "borderless";
	style?: CSSProperties;
};

type CardHeaderProps = {
	children?: ReactNode;
	trailing?: ReactNode;
	style?: CSSProperties;
};

type TableProps = {
	headers: ReactNode[];
	rows: ReactNode[][];
	rowTone?: Array<
		"success" | "danger" | "warning" | "info" | "neutral" | undefined
	>;
	striped?: boolean;
	stickyHeader?: boolean;
	framed?: boolean;
	style?: CSSProperties;
};

type ButtonProps = {
	children?: ReactNode;
	variant?: "primary" | "secondary" | "ghost";
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
	style?: CSSProperties;
	onClick?: () => void;
};

type PillProps = {
	children?: ReactNode;
	active?: boolean;
	size?: "sm" | "md";
	style?: CSSProperties;
	onClick?: () => void;
};

type CalloutProps = {
	children?: ReactNode;
	title?: ReactNode;
	tone?: "info" | "success" | "warning" | "danger" | "neutral";
	style?: CSSProperties;
};

type StatProps = {
	value: ReactNode;
	label: string;
	style?: CSSProperties;
};

const textToneClassName = {
	primary: "text-foreground",
	secondary: "text-default-600",
	tertiary: "text-default-500",
	quaternary: "text-default-400",
};

const rowToneClassName = {
	success: "border-l-success",
	danger: "border-l-danger",
	warning: "border-l-warning",
	info: "border-l-primary",
	neutral: "border-l-default-300",
};

function alignToClassName(value: RowProps["align"]) {
	return {
		start: "items-start",
		center: "items-center",
		end: "items-end",
		stretch: "items-stretch",
	}[value || "stretch"];
}

function justifyToClassName(value: RowProps["justify"]) {
	return {
		start: "justify-start",
		center: "justify-center",
		end: "justify-end",
		"space-between": "justify-between",
	}[value || "start"];
}

function fontWeightToClassName(value: TextProps["weight"]) {
	return {
		normal: "font-normal",
		medium: "font-medium",
		semibold: "font-semibold",
		bold: "font-bold",
	}[value || "normal"];
}

export function Stack({ children, gap = 12, style }: LayoutProps) {
	return (
		<div className="flex flex-col" style={{ gap, ...style }}>
			{children}
		</div>
	);
}

export function Row({
	children,
	gap = 8,
	align = "center",
	justify = "start",
	wrap,
	style,
}: RowProps) {
	return (
		<div
			className={`flex ${alignToClassName(align)} ${justifyToClassName(justify)} ${wrap ? "flex-wrap" : ""}`}
			style={{ gap, ...style }}
		>
			{children}
		</div>
	);
}

export function Grid({
	children,
	columns,
	gap = 12,
	align = "stretch",
	style,
}: GridProps) {
	const gridTemplateColumns =
		typeof columns === "number"
			? `repeat(${columns}, minmax(0, 1fr))`
			: columns;

	return (
		<div
			className={`grid ${alignToClassName(align)}`}
			style={{ gridTemplateColumns, gap, ...style }}
		>
			{children}
		</div>
	);
}

export function Spacer() {
	return <div className="flex-1" />;
}

export function Divider({ style }: { style?: CSSProperties }) {
	return <hr className="border-default-200" style={style} />;
}

export function H1({
	children,
	style,
}: {
	children?: ReactNode;
	style?: CSSProperties;
}) {
	return (
		<h1
			className="text-3xl font-semibold tracking-tight sm:text-4xl"
			style={style}
		>
			{children}
		</h1>
	);
}

export function H2({
	children,
	style,
}: {
	children?: ReactNode;
	style?: CSSProperties;
}) {
	return (
		<h2 className="text-2xl font-semibold tracking-tight" style={style}>
			{children}
		</h2>
	);
}

export function H3({
	children,
	style,
}: {
	children?: ReactNode;
	style?: CSSProperties;
}) {
	return (
		<h3 className="text-lg font-semibold tracking-tight" style={style}>
			{children}
		</h3>
	);
}

export function Text({
	children,
	tone = "primary",
	size = "body",
	as = "p",
	weight = "normal",
	italic,
	truncate,
	style,
}: TextProps) {
	const Component = as;
	const truncateClassName = truncate
		? truncate === "start"
			? "truncate direction-rtl"
			: "truncate"
		: "";

	return (
		<Component
			className={`${textToneClassName[tone]} ${size === "small" ? "text-sm" : "text-base"} ${fontWeightToClassName(weight)} ${italic ? "italic" : ""} ${truncateClassName}`}
			style={style}
		>
			{children}
		</Component>
	);
}

export function Code({
	children,
	style,
}: {
	children?: ReactNode;
	style?: CSSProperties;
}) {
	return (
		<code
			className="rounded bg-default-100 px-1.5 py-0.5 font-mono text-[0.92em] text-default-800 dark:bg-default-200"
			style={style}
		>
			{children}
		</code>
	);
}

export function Card({
	children,
	variant = "default",
	size = "base",
	style,
}: CardProps) {
	return (
		<section
			className={
				variant === "borderless"
					? "rounded-2xl"
					: "overflow-hidden rounded-2xl border border-default-200/80 bg-content1/85 dark:bg-content1/72"
			}
			style={style}
		>
			<div className={size === "lg" ? "min-h-0" : ""}>{children}</div>
		</section>
	);
}

export function CardHeader({ children, trailing, style }: CardHeaderProps) {
	return (
		<header
			className="flex min-h-10 items-center justify-between gap-3 border-b border-default-200/70 px-4 py-2 text-sm font-semibold"
			style={style}
		>
			<span>{children}</span>
			{trailing ? <span className="shrink-0">{trailing}</span> : null}
		</header>
	);
}

export function CardBody({
	children,
	style,
}: {
	children?: ReactNode;
	style?: CSSProperties;
}) {
	return (
		<div className="p-4 sm:p-5" style={style}>
			{children}
		</div>
	);
}

export function Button({
	children,
	variant = "secondary",
	disabled,
	type = "button",
	style,
	onClick,
}: ButtonProps) {
	const className =
		variant === "primary"
			? "bg-primary text-white hover:opacity-90"
			: variant === "ghost"
				? "border border-transparent text-primary hover:bg-primary/10"
				: "border border-default-200 bg-content1 text-foreground hover:bg-default-100";

	return (
		<button
			className={`inline-flex h-8 items-center rounded-full px-3 text-sm font-medium transition ${className}`}
			disabled={disabled}
			type={type}
			style={style}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

export function Pill({
	children,
	active,
	size = "md",
	style,
	onClick,
}: PillProps) {
	const Component = onClick ? "button" : "span";

	return (
		<Component
			className={`${active ? "bg-primary text-white" : "border border-default-200 bg-content1 text-default-700"} inline-flex items-center rounded-full ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"} font-medium`}
			type={onClick ? "button" : undefined}
			style={style}
			onClick={onClick}
		>
			{children}
		</Component>
	);
}

export function Callout({
	children,
	title,
	tone = "neutral",
	style,
}: CalloutProps) {
	const className =
		tone === "warning"
			? "border-warning/30 bg-warning/10"
			: tone === "danger"
				? "border-danger/30 bg-danger/10"
				: tone === "success"
					? "border-success/30 bg-success/10"
					: tone === "info"
						? "border-primary/30 bg-primary/10"
						: "border-default-200 bg-default-100/50";

	return (
		<div className={`rounded-2xl border p-4 ${className}`} style={style}>
			{title ? (
				<p className="mb-1 font-semibold text-foreground">{title}</p>
			) : null}
			<div className="text-default-700">{children}</div>
		</div>
	);
}

export function Stat({ value, label, style }: StatProps) {
	return (
		<div
			className="rounded-2xl border border-default-200/80 bg-content1/85 p-4 dark:bg-content1/72"
			style={style}
		>
			<div className="text-2xl font-semibold tracking-tight text-foreground">
				{value}
			</div>
			<div className="mt-1 text-sm text-default-600">{label}</div>
		</div>
	);
}

function nodeKey(value: ReactNode) {
	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}

	if (isValidElement(value) && value.key) {
		return String(value.key);
	}

	return "node";
}

export function Table({
	headers,
	rows,
	rowTone,
	striped,
	stickyHeader,
	framed = true,
	style,
}: TableProps) {
	return (
		<div
			className={
				framed
					? "overflow-x-auto rounded-2xl border border-default-200/80"
					: "overflow-x-auto"
			}
			style={style}
		>
			<table className="min-w-full border-collapse text-left text-sm">
				<thead
					className={
						stickyHeader ? "sticky top-0 bg-content1" : "bg-default-100/70"
					}
				>
					<tr>
						{headers.map((header) => (
							<th
								key={nodeKey(header)}
								className="border-b border-default-200 px-3 py-2 font-semibold text-default-700"
							>
								{header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => {
						const rowKey = row.map(nodeKey).join("|");
						const rowIndex = rows.indexOf(row);

						return (
							<tr
								key={rowKey}
								className={`${striped && rowIndex % 2 === 1 ? "bg-default-50/70 dark:bg-default-100/30" : ""} ${rowTone?.[rowIndex] ? `border-l-4 ${rowToneClassName[rowTone[rowIndex] || "neutral"]}` : ""}`}
							>
								{headers.map((header) => {
									const cellIndex = headers.indexOf(header);

									return (
										<td
											key={`${rowKey}-${nodeKey(header)}`}
											className="max-w-[34rem] border-b border-default-100 px-3 py-2 align-top text-default-700"
										>
											{row[cellIndex]}
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

export function useHostTheme() {
	return {
		text: {
			primary: "var(--foreground)",
			secondary: "var(--portfolio-default-600)",
			tertiary: "var(--portfolio-default-500)",
			quaternary: "var(--portfolio-default-400)",
			link: "var(--portfolio-primary)",
			onAccent: "white",
		},
		bg: {
			editor: "var(--background)",
			chrome: "var(--portfolio-content2)",
			elevated: "var(--portfolio-content1)",
		},
		fill: {
			primary: "var(--portfolio-primary)",
			secondary: "var(--portfolio-content2)",
			tertiary: "var(--portfolio-default-100)",
			quaternary: "var(--portfolio-default-50)",
		},
		stroke: {
			primary: "var(--portfolio-default-300)",
			secondary: "var(--portfolio-default-200)",
			tertiary: "var(--portfolio-default-100)",
		},
		accent: {
			primary: "var(--portfolio-primary)",
			control: "var(--portfolio-primary)",
		},
	};
}

export function useCanvasState<T>(key: string, defaultValue: T) {
	const [value, setValue] = useState<T>(defaultValue);

	useEffect(() => {
		try {
			const storedValue = window.localStorage.getItem(`local-canvas:${key}`);

			if (storedValue) {
				setValue(JSON.parse(storedValue));
			}
		} catch {
			setValue(defaultValue);
		}
	}, [defaultValue, key]);

	useEffect(() => {
		try {
			window.localStorage.setItem(`local-canvas:${key}`, JSON.stringify(value));
		} catch {
			// Local preview state is best-effort only.
		}
	}, [key, value]);

	return [value, setValue] as const;
}

export function useCanvasAction() {
	return (action: { type: string; path?: string }) => {
		if (action.type === "openFile" && action.path) {
			window.alert(`Open ${action.path} in Cursor from the repo tree.`);
		}
	};
}
