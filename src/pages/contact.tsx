import React from "react";
import { z } from "zod";
import { useZodForm } from "@/hooks/useZodForm";
import DefaultLayout from "@/layouts/default";
import { Toaster, toast } from 'sonner';
import { siteConfig } from "@/config/site";
import { InlineWidget} from "react-calendly";
import { Accordion, AccordionItem, Button, Input, Kbd, Spinner, Textarea } from "@nextui-org/react";
import { Controller, SubmitHandler } from "react-hook-form";
import { useTheme } from "next-themes";

const contactFormSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    phone: z.string().min(10, "Invalid Phone Number").max(10, "Invalid Phone Number"),
    subject: z.string().min(10, "Subject should be more than 10 characters atleast."),
    message: z.string().min(10, "Message should be more than 10 characters atleast.")
  });

export default function Contact() {

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
            message: ""
        },
    });

    const onSubmit: SubmitHandler<z.infer<typeof contactFormSchema>> = async (data) => {
        try {
            console.log(data);
            toast.success("Contact message successfully sent!");
            reset();
        } catch (error) {
            toast.error("Contact message failed to sent!")
        }
      };

    const contactForm = (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-3 places-items-center w-full mb-2"
            noValidate>

            <p className="text-2xl hidden lg:block font-bold pl-1 mb-2">Contact Me</p>

            <Toaster richColors theme={toastTheme} position="bottom-left"/>

            <Controller
                name="name"
                control={control}
                render={({ field }) => (
                <Input
                    {...field}
                    type="text"
                    variant="faded"
                    label="Name" 
                    isInvalid={!!errors.name}
                    errorMessage={errors.name?.message}
                />
                )}
            />

            <Controller
                name="email"
                control={control}
                render={({ field }) => (
                <Input
                    {...field}
                    type="email"
                    variant="faded"
                    label="Email" 
                    isInvalid={!!errors.email}
                    errorMessage={errors.email?.message}
                />
                )}
            />

            <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                <Input
                    {...field}
                    type="tel"
                    variant="faded"
                    label="Phone" 
                    isInvalid={!!errors.phone}
                    errorMessage={errors.phone?.message}
                />
                )}
            />

            <Controller
                name="subject"
                control={control}
                render={({ field }) => (
                <Input
                    {...field}
                    type="text"
                    variant="faded"
                    label="Subject" 
                    isInvalid={!!errors.subject}
                    errorMessage={errors.subject?.message}
                />
                )}
            />

            <Controller
                name="message"
                control={control}
                render={({ field }) => (
                <Textarea
                    {...field}
                    variant="faded"
                    className="col-span-12 md:col-span-6 mb-6 md:mb-0"
                    minRows={5}
                    label="Message" 
                    isInvalid={!!errors.message}
                    errorMessage={errors.message?.message}
                />
                )}
            />

            <Button type="submit" variant="solid" color={(isSubmitting) ? "default" : "primary"} radius="full" disabled={isSubmitting}>
                {isSubmitting ? <Spinner /> : 'Send Message'}
            </Button>

        </form>
    );

    const scheduleWidget = (
        <div className="contents lg:flex places-items-center w-full mb-2">
            <InlineWidget url={siteConfig.links.calendly} pageSettings={{hideGdprBanner: true}} styles={{background: "rgba(255, 255, 255, 0)", width: "100%", height: "80vh", overflow: "auto"}}/>
        </div>
    );
    return (
        <DefaultLayout>
			<section className="hidden lg:flex flex-row justify-center gap-4 py-8">
                {contactForm}
                {scheduleWidget}
            </section>
            <section className="contents lg:hidden items-center justify-center gap-4 py-8">
                <Accordion>
                    <AccordionItem key="1" aria-label="Contact Me" subtitle="Press to send me a message" title="Contact">
                        {contactForm}
                    </AccordionItem>
                    <AccordionItem key="2" aria-label="Schedule a Call" subtitle="Press to schedule a call" title="Schedule a Call">
                        {scheduleWidget}
                    </AccordionItem>
                </Accordion>
            </section>
        </DefaultLayout>
    );
}