import type { GetStaticProps } from "next";
import React from "react";

import { z } from "zod";
import { Controller, type SubmitHandler } from "react-hook-form";
import { InlineWidget } from "react-calendly";
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Textarea,
} from "@heroui/react";
import { Toaster, toast } from "sonner";
import { useTheme } from "next-themes";
import { FaLinkedin } from "react-icons/fa6";
import { HiOutlineCalendarDays } from "react-icons/hi2";
import { MdMail } from "react-icons/md";

import { siteConfig } from "@/config/site";
import { SocialLinkButton } from "@/components/social-link-button";
import { useZodForm } from "@/hooks/useZodForm";
import { getContactSettings } from "@/lib/content";
import { getGeneratedPageOgImage, getSeoImage, getSiteUrl } from "@/lib/seo";
import DefaultLayout from "@/layouts/default";
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

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getErrorMessage(message: unknown) {
  return typeof message === "string" ? message : undefined;
}

export default function Contact({ settings }: ContactPageProps) {
  const { resolvedTheme, theme } = useTheme();
  const activeTheme = resolvedTheme || theme || "light";
  const isDark = activeTheme === "dark";
  const toastTheme = activeTheme as "light" | "dark" | "system";

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
      await wait(400);
      console.log(data);
      toast.success("Contact message successfully sent!");
      reset();
    } catch {
      toast.error("Contact message failed to send.");
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

  const formFieldClassNames = {
    base: "group",
    inputWrapper:
      "border border-default-200/80 bg-content1/90 transition-colors dark:border-default-100/14 dark:bg-[#13233c] dark:data-[hover=true]:bg-[#162946] dark:group-data-[focus=true]:border-primary/45 dark:group-data-[focus=true]:bg-[#162946]",
    input: "text-foreground placeholder:text-default-400",
    label: "text-default-500 dark:text-default-400",
    errorMessage: "text-danger",
  } as const;

  const contactForm = (
    <Card
      className="border border-default-200/80 bg-content1/85 shadow-sm shadow-primary/5 dark:bg-content1/72"
    >
      <CardHeader className="flex flex-col items-start gap-4 px-4 py-5 sm:px-8 sm:py-6">
        <Chip
          classNames={{
            base: "border border-primary/20 bg-primary/10 text-primary",
            content: "font-medium uppercase tracking-[0.10em] text-[11px]",
          }}
          radius="full"
          size="sm"
          variant="flat"
        >
          {settings.title}
        </Chip>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{settings.formHeading}</h2>
          <p className="max-w-xl text-default-600">{settings.description}</p>
        </div>
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
      </CardHeader>
      <CardBody className="px-4 pb-5 pt-0 sm:px-8 sm:pb-8">
        <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-4" noValidate>
          <Toaster position="bottom-left" richColors theme={toastTheme} />

          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  {...field}
                  classNames={formFieldClassNames}
                  errorMessage={getErrorMessage(errors.name?.message)}
                  isInvalid={!!errors.name}
                  label="Name"
                  radius="lg"
                  variant="bordered"
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input
                  {...field}
                  classNames={formFieldClassNames}
                  errorMessage={getErrorMessage(errors.email?.message)}
                  isInvalid={!!errors.email}
                  label="Email"
                  radius="lg"
                  type="email"
                  variant="bordered"
                />
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Input
                  {...field}
                  classNames={formFieldClassNames}
                  errorMessage={getErrorMessage(errors.phone?.message)}
                  isInvalid={!!errors.phone}
                  label="Phone"
                  radius="lg"
                  type="tel"
                  variant="bordered"
                />
              )}
            />

            <Controller
              control={control}
              name="subject"
              render={({ field }) => (
                <Input
                  {...field}
                  classNames={formFieldClassNames}
                  errorMessage={getErrorMessage(errors.subject?.message)}
                  isInvalid={!!errors.subject}
                  label="Subject"
                  radius="lg"
                  type="text"
                  variant="bordered"
                />
              )}
            />
          </div>

          <Controller
            control={control}
            name="message"
            render={({ field }) => (
              <Textarea
                {...field}
                classNames={formFieldClassNames}
                errorMessage={getErrorMessage(errors.message?.message)}
                isInvalid={!!errors.message}
                label="Message"
                minRows={6}
                radius="lg"
                variant="bordered"
              />
            )}
          />

          <div className="flex justify-start pt-2">
            <Button
              color="primary"
              isLoading={isSubmitting}
              radius="full"
              type="submit"
              variant="solid"
            >
              Send message
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );

  const scheduleWidget = (
    <Card
      className="overflow-hidden border border-default-200/80 bg-content1/85 shadow-sm shadow-primary/5 dark:bg-content1/72"
    >
      <CardHeader className="flex flex-col items-start gap-4 px-4 pt-5 sm:px-8 sm:pt-6">
        <Chip
          classNames={{
            base: "border border-primary/20 bg-primary/10 text-primary",
            content: "font-medium uppercase tracking-[0.10em] text-[11px]",
          }}
          radius="full"
          size="sm"
          variant="flat"
        >
          Schedule
        </Chip>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{settings.scheduleHeading}</h2>
          {/* <p className="max-w-xl text-default-600">
            Pick a time that works. The embed is styled to sit more naturally inside the portfolio in both light and dark themes.
          </p> */}
        </div>
      </CardHeader>
      <CardBody className="px-0 pb-0 pt-0">
        {/* <div className="px-4 sm:px-8">
          <Divider className="opacity-60" />
        </div> */}
        <div className="p-2 sm:p-5 pt-0 sm:pt-0">
          <div className="overflow-hidden rounded-[1.35rem] border border-default-200/80 bg-default-50/60 shadow-inner dark:bg-default-100/5 sm:rounded-3xl">
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
      </CardBody>
    </Card>
  );

  return (
    <DefaultLayout
      seo={{
        title: `${settings.title}`,
        description: settings.description || siteConfig.description,
        pathname: "/contact",
        image: getSeoImage(siteConfig.avatar, getGeneratedPageOgImage("contact")),
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
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{settings.title}</h1>
          <p className="max-w-2xl text-default-700">{settings.description}</p>
        </div>

        <section className="hidden gap-8 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          {contactForm}
          {scheduleWidget}
        </section>

        <section className="lg:hidden">
          <Accordion
            itemClasses={{
              base: "border border-default-200/80 bg-background/80 shadow-sm",
              indicator: "text-primary",
              subtitle: "mt-2 text-default-500",
              title: "text-lg font-semibold tracking-tight",
              trigger: "px-4 py-4 sm:px-5 sm:py-5",
              content: "px-0 pb-0 pt-0",
            }}
            variant="splitted"
          >
            <AccordionItem
              key="contact"
              aria-label="Contact Me"
              subtitle="Send a message directly"
              title="Contact"
            >
              {contactForm}
            </AccordionItem>
            <AccordionItem
              key="schedule"
              aria-label="Schedule a Call"
              subtitle="Book a short intro call"
              title="Schedule a Call"
            >
              {scheduleWidget}
            </AccordionItem>
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
