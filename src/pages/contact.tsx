import {
	Accordion,
	Card,
	CardContent,
	CardHeader,
	FieldError,
	Input,
	Label,
	TextArea,
	TextField,
	toast,
} from "@heroui/react";
import type { GetStaticProps } from "next";
import { useTheme } from "next-themes";
import { InlineWidget } from "react-calendly";
import { Controller, type SubmitHandler } from "react-hook-form";
import { FaLinkedin } from "react-icons/fa6";
import { MdMail } from "react-icons/md";
import { z } from "zod";
import { SocialLinkButton } from "@/components/social-link-button";
import { siteConfig } from "@/config/site";
import { useZodForm } from "@/hooks/useZodForm";
import DefaultLayout from "@/layouts/default";
import { getContactSettings } from "@/lib/content";
import { getGeneratedPageOgImage, getSeoImage, getSiteUrl } from "@/lib/seo";
import type { ContactSettings } from "@/types/content";

const contactFormSchema = z.object({
	name: z.string().min(1, { message: "Name is required" }),
	email: z.string().email({ message: "Invalid email address" }),
	phone: z
		.string()
		.min(10, "Invalid Phone Number")
		.max(10, "Invalid Phone Number"),
	subject: z.string().min(10, "Subject should be at least 10 characters."),
	message: z.string().min(10, "Message should be at least 10 characters."),
});

type ContactPageProps = {
	settings: ContactSettings;
};

type ContactFormValues = z.infer<typeof contactFormSchema>;

function getErrorMessage(message: unknown) {
	return typeof message === "string" ? message : undefined;
}

export default function Contact({ settings }: ContactPageProps) {
	const { resolvedTheme, theme } = useTheme();

	const activeTheme = resolvedTheme || theme || "light";
	const isDark = activeTheme === "dark";
	// const toastTheme = activeTheme as "light" | "dark" | "system";

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useZodForm<ContactFormValues>({
		schema: contactFormSchema,
		defaultValues: {
			name: "",
			email: "",
			phone: "",
			subject: "",
			message: "",
		},
	});

	const onSubmit: SubmitHandler<ContactFormValues> = async (data) => {
		try {
			const workerUrl = process.env.NEXT_PUBLIC_CONTACT_WORKER_URL;

			if (workerUrl) {
				const response = await fetch(`${workerUrl}/contact`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});

				if (!response.ok) {
					const result = await response.json().catch(() => null);
					throw new Error(result?.error || "Failed to submit contact form");
				}
			}

			toast.success(
				`Thanks for reaching out, ${data.name}! I will get back to you soon.`,
			);
			reset();
		} catch {
			toast.danger(`Oops! Something went wrong. Please try again later.`);
		}
	};

	const calendlyPageSettings = {
		hideGdprBanner: true,
		hideLandingPageDetails: false,
		hideEventTypeDetails: false,
		backgroundColor: isDark ? "0f172a" : "f8fafc",
		textColor: isDark ? "e5e7eb" : "111827",
		primaryColor: "0072f5",
	};

	const textFieldClassName = "w-full";

	const inputClassName =
		"rounded-2xl border border-default-200/80 bg-content1/90 px-4 py-3 text-base text-foreground shadow-none outline-none transition-colors placeholder:text-default-400 sm:text-sm dark:border-default-100/14 dark:bg-[#13233c] focus:border-primary/45";

	const labelClassName = "sr-only";

	const fieldErrorClassName = "text-sm text-danger";

	const contactForm = (
		<Card className="mb-5 border-none bg-transparent shadow-none lg:border lg:border-default-200/80 lg:bg-content1/85 lg:shadow-sm lg:shadow-primary/5 lg:dark:bg-content1/72">
			<CardHeader className="hidden flex-col items-start gap-4 px-4 py-5 lg:px-8 lg:py-6 lg:flex">
				{/* <Chip
          classNames={{
            base: "border border-primary/20 bg-primary/10 text-primary",
            content: "font-medium uppercase tracking-[0.10em] text-[11px]",
          }}
          radius="full"
          size="sm"
          variant="flat"
        >
          {settings.title}
        </Chip> */}
				<div className="space-y-2">
					<h2 className=" text-2xl font-semibold tracking-tight ">
						{settings.formHeading}
					</h2>
					{/* <p className="max-w-xl text-default-600">{settings.description}</p> */}
				</div>
			</CardHeader>
			<CardContent className="px-4 pb-5 pt-0 lg:px-8 lg:pb-8">
				<form
					className="flex w-full flex-col gap-4"
					noValidate
					onSubmit={handleSubmit(onSubmit)}
				>
					{/* <Toaster position="bottom-left" richColors theme={toastTheme} /> */}

					<div className="grid gap-4 md:grid-cols-2">
						<Controller
							control={control}
							name="name"
							render={({ field }) => (
								<TextField
									className={textFieldClassName}
									isInvalid={!!errors.name}
									name={field.name}
									value={field.value}
								>
									<Label className={labelClassName}>Name</Label>
									<Input
										aria-label="Name"
										className={`${inputClassName} ${errors.name ? "border-danger" : ""}`}
										onBlur={field.onBlur}
										onChange={field.onChange}
										placeholder="Name"
										ref={field.ref}
										variant="secondary"
									/>
									<FieldError className={fieldErrorClassName}>
										{getErrorMessage(errors.name?.message)}
									</FieldError>
								</TextField>
							)}
						/>

						<Controller
							control={control}
							name="email"
							render={({ field }) => (
								<TextField
									className={textFieldClassName}
									isInvalid={!!errors.email}
									name={field.name}
									type="email"
									value={field.value}
								>
									<Label className={labelClassName}>Email</Label>
									<Input
										aria-label="Email"
										className={`${inputClassName} ${errors.email ? "border-danger" : ""}`}
										onBlur={field.onBlur}
										onChange={field.onChange}
										placeholder="Email"
										ref={field.ref}
										variant="secondary"
									/>
									<FieldError className={fieldErrorClassName}>
										{getErrorMessage(errors.email?.message)}
									</FieldError>
								</TextField>
							)}
						/>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Controller
							control={control}
							name="phone"
							render={({ field }) => (
								<TextField
									className={textFieldClassName}
									isInvalid={!!errors.phone}
									name={field.name}
									type="tel"
									value={field.value}
								>
									<Label className={labelClassName}>Phone</Label>
									<Input
										aria-label="Phone"
										className={`${inputClassName} ${errors.phone ? "border-danger" : ""}`}
										onBlur={field.onBlur}
										onChange={field.onChange}
										placeholder="Phone"
										ref={field.ref}
										variant="secondary"
									/>
									<FieldError className={fieldErrorClassName}>
										{getErrorMessage(errors.phone?.message)}
									</FieldError>
								</TextField>
							)}
						/>

						<Controller
							control={control}
							name="subject"
							render={({ field }) => (
								<TextField
									className={textFieldClassName}
									isInvalid={!!errors.subject}
									name={field.name}
									type="text"
									value={field.value}
								>
									<Label className={labelClassName}>Subject</Label>
									<Input
										aria-label="Subject"
										className={`${inputClassName} ${errors.subject ? "border-danger" : ""}`}
										onBlur={field.onBlur}
										onChange={field.onChange}
										placeholder="Subject"
										ref={field.ref}
										variant="secondary"
									/>
									<FieldError className={fieldErrorClassName}>
										{getErrorMessage(errors.subject?.message)}
									</FieldError>
								</TextField>
							)}
						/>
					</div>

					<Controller
						control={control}
						name="message"
						render={({ field }) => (
							<TextField
								className={textFieldClassName}
								isInvalid={!!errors.message}
								name={field.name}
								value={field.value}
							>
								<Label className={labelClassName}>Message</Label>
								<TextArea
									aria-label="Message"
									className={`${inputClassName} min-h-28 resize-y ${errors.message ? "border-danger" : ""}`}
									onBlur={field.onBlur}
									onChange={field.onChange}
									placeholder="Message"
									ref={field.ref}
									variant="secondary"
								/>
								<FieldError className={fieldErrorClassName}>
									{getErrorMessage(errors.message?.message)}
								</FieldError>
							</TextField>
						)}
					/>

					<div className="flex justify-start pt-2">
						<button
							className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
							disabled={isSubmitting}
							type="submit"
						>
							{isSubmitting ? "Sending..." : "Send message"}
						</button>
					</div>
				</form>
			</CardContent>
		</Card>
	);

	const scheduleWidget = (
		<Card className="overflow-hidden border border-default-200/80 bg-content1/85 shadow-sm shadow-primary/5 dark:bg-content1/72 mb-5 p-0">
			<CardHeader className="hidden flex-col items-start gap-4 px-4 pt-5 sm:px-8 sm:pt-6 lg:flex">
				{/* <Chip
          classNames={{
            base: "border border-primary/20 bg-primary/10 text-primary",
            content: "font-medium uppercase tracking-[0.10em] text-[11px]",
          }}
          radius="full"
          size="sm"
          variant="flat"
        >
          Schedule
        </Chip> */}
				<div className="space-y-2">
					<h2 className="text-2xl font-semibold tracking-tight">
						{settings.scheduleHeading}
					</h2>
					{/* <p className="max-w-xl text-default-600">
            Pick a time that works. The embed is styled to sit more naturally inside the portfolio in both light and dark themes.
          </p> */}
				</div>
			</CardHeader>
			<CardContent>
				{/* <div className="px-4 sm:px-8">
          <Divider className="opacity-60" />
        </div> */}
				<div className="p-0 lg:p-5">
					<div className="overflow-hidden rounded-none border-0 bg-default-50/60 shadow-inner dark:bg-default-100/5 lg:rounded-3xl lg:border lg:border-default-200/80">
						{/* <div className="flex items-center gap-2 border-b border-default-200/70 px-3 py-3 text-sm text-default-500 sm:px-4">
              <HiOutlineCalendarDays className="text-primary" size={16} />
              <span>{settings.scheduleHeading}</span>
            </div> */}
						<InlineWidget
							className="calendly-embed"
							iframeTitle="Schedule a call with Hassan Raza"
							pageSettings={calendlyPageSettings}
							styles={{
								background: "transparent",
								height: "700px",
								minWidth: "100%",
								width: "100%",
							}}
							url={siteConfig.links.calendly}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);

	return (
		<DefaultLayout
			seo={{
				title: `${settings.title}`,
				description: settings.description || siteConfig.description,
				pathname: "/contact",
				image: getSeoImage(
					siteConfig.avatar,
					getGeneratedPageOgImage("contact"),
				),
				structuredData: {
					"@context": "https://schema.org",
					"@type": "ContactPage",
					name: settings.title,
					url: getSiteUrl("/contact"),
					description: settings.description || siteConfig.description,
				},
			}}
		>
			<section className="mx-auto max-w-6xl py-10 sm:py-14">
				<div className="mb-10 space-y-4">
					{/* <Chip
            classNames={{
              base: "border border-primary/20 bg-primary/10 text-primary",
              content: "font-medium uppercase tracking-[0.10em] text-[11px]",
            }}
            radius="full"
            size="sm"
            variant="flat"
          >
            {settings.title}
          </Chip> */}
					<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
						{settings.title}
					</h1>
					<p className="max-w-2xl text-default-700">{settings.description}</p>
					<div className="flex flex-wrap gap-2">
						<SocialLinkButton
							href="mailto:hello@hassanraza.us"
							icon={<MdMail size={18} />}
							isExternal={false}
							label="Email"
						/>
						<SocialLinkButton
							href={siteConfig.links.linkedin}
							icon={<FaLinkedin size={18} />}
							label="LinkedIn"
						/>
					</div>
				</div>

				<section className="hidden gap-8 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
					{contactForm}
					{scheduleWidget}
				</section>

				<section className="lg:hidden">
					<Accordion className="space-y-4" hideSeparator>
						<Accordion.Item
							className="overflow-hidden rounded-3xl border border-default-200/80 bg-background/80 shadow-sm"
							id="contact-form"
						>
							<Accordion.Heading>
								<Accordion.Trigger className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-lg font-semibold tracking-tight transition-colors hover:bg-default-100/40 sm:px-5 sm:py-5 dark:hover:bg-default-100/5">
									<span>{settings.formHeading}</span>
									<Accordion.Indicator className="shrink-0 text-primary" />
								</Accordion.Trigger>
							</Accordion.Heading>
							<Accordion.Panel>
								<Accordion.Body className="p-0">{contactForm}</Accordion.Body>
							</Accordion.Panel>
						</Accordion.Item>
						<Accordion.Item
							className="overflow-hidden rounded-3xl border border-default-200/80 bg-background/80 shadow-sm"
							id="schedule-widget"
						>
							<Accordion.Heading>
								<Accordion.Trigger className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-lg font-semibold tracking-tight transition-colors hover:bg-default-100/40 sm:px-5 sm:py-5 dark:hover:bg-default-100/5">
									<span>{settings.scheduleHeading}</span>
									<Accordion.Indicator className="shrink-0 text-primary" />
								</Accordion.Trigger>
							</Accordion.Heading>
							<Accordion.Panel>
								<Accordion.Body className="px-5 pb-3">
									{scheduleWidget}
								</Accordion.Body>
							</Accordion.Panel>
						</Accordion.Item>
					</Accordion>
				</section>
			</section>
		</DefaultLayout>
	);
}

export const getStaticProps: GetStaticProps<ContactPageProps> = async () => {
	return {
		props: {
			settings: getContactSettings(),
		},
	};
};
