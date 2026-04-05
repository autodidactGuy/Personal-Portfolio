import type { GetStaticProps } from "next";
import React from "react";

import { z } from "zod";
import { Controller, type SubmitHandler } from "react-hook-form";
import { InlineWidget } from "react-calendly";
import { Accordion, AccordionItem, Button, Input, Textarea } from "@nextui-org/react";
import { Toaster, toast } from "sonner";
import { useTheme } from "next-themes";

import { siteConfig } from "@/config/site";
import { useZodForm } from "@/hooks/useZodForm";
import { getContactSettings } from "@/lib/content";
import DefaultLayout from "@/layouts/default";
import type { ContactSettings } from "@/types/content";

const contactFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().min(10, "Invalid Phone Number").max(10, "Invalid Phone Number"),
  subject: z.string().min(10, "Subject should be at least 10 characters."),
  message: z.string().min(10, "Message should be at least 10 characters."),
});

type ContactPageProps = {
  settings: ContactSettings;
};

export default function Contact({ settings }: ContactPageProps) {
  const { theme } = useTheme();
  const toastTheme = theme as "light" | "dark" | "system";

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useZodForm({
    schema: contactFormSchema,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof contactFormSchema>> = async (data) => {
    return new Promise(() => {
      setTimeout(() => {
        try {
          console.log(data);
          toast.success("Contact message successfully sent!");
          reset();
        } catch (error) {
          toast.error("Contact message failed to send.");
        }
      }, 0);
    });
  };

  const contactForm = (
    <form onSubmit={handleSubmit(onSubmit)} className="mb-2 flex w-full flex-col gap-3" noValidate>
      <div className="mb-4">
        <p className="text-2xl font-bold">{settings.formHeading}</p>
        <p className="mt-2 text-default-600">{settings.description}</p>
      </div>

      <Toaster richColors theme={toastTheme} position="bottom-left" />

      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <Input {...field} type="text" variant="faded" label="Name" isInvalid={!!errors.name} errorMessage={errors.name?.message} />
        )}
      />

      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <Input {...field} type="email" variant="faded" label="Email" isInvalid={!!errors.email} errorMessage={errors.email?.message} />
        )}
      />

      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <Input {...field} type="tel" variant="faded" label="Phone" isInvalid={!!errors.phone} errorMessage={errors.phone?.message} />
        )}
      />

      <Controller
        name="subject"
        control={control}
        render={({ field }) => (
          <Input {...field} type="text" variant="faded" label="Subject" isInvalid={!!errors.subject} errorMessage={errors.subject?.message} />
        )}
      />

      <Controller
        name="message"
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            variant="faded"
            className="col-span-12 mb-6 md:col-span-6 md:mb-0"
            minRows={5}
            label="Message"
            isInvalid={!!errors.message}
            errorMessage={errors.message?.message}
          />
        )}
      />

      <Button type="submit" variant="solid" color={isSubmitting ? "default" : "primary"} radius="full" isLoading={isSubmitting}>
        Send Message
      </Button>
    </form>
  );

  const scheduleWidget = (
    <div className="mb-2 w-full">
      <p className="mb-4 text-2xl font-bold">{settings.scheduleHeading}</p>
      <InlineWidget
        url={siteConfig.links.calendly}
        pageSettings={{ hideGdprBanner: true }}
        styles={{ background: "rgba(255, 255, 255, 0)", width: "100%", height: "80vh", overflow: "auto" }}
      />
    </div>
  );

  return (
    <DefaultLayout>
      <section className="mx-auto max-w-screen-lg py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold">{settings.title}</h1>
          <p className="mt-3 max-w-2xl text-default-700">{settings.description}</p>
        </div>

        <section className="hidden gap-8 lg:grid lg:grid-cols-2">
          {contactForm}
          {scheduleWidget}
        </section>

        <section className="lg:hidden">
          <Accordion>
            <AccordionItem key="contact" aria-label="Contact Me" subtitle="Press to send a message" title="Contact">
              {contactForm}
            </AccordionItem>
            <AccordionItem key="schedule" aria-label="Schedule a Call" subtitle="Press to schedule a call" title="Schedule a Call">
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
