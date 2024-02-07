import DefaultLayout from "@/layouts/default";
import { siteConfig } from "@/config/site";
import { InlineWidget} from "react-calendly";
import { Accordion, AccordionItem, Button, Input, Kbd, Textarea } from "@nextui-org/react";


export default function Contact() {

    const contactForm = (
        <form className="flex flex-col gap-3 places-items-center w-full mb-2">
            <p className="text-2xl hidden lg:block font-bold pl-1 mb-2">Contact Me</p>
            <Input type="text" variant="faded" label="Name" required/>
            <Input type="email" variant="faded" label="Email" required/>
            <Input type="tel" variant="faded" label="Phone" required/>
            <Input type="text" variant="faded" label="Subject" required/>
            <Textarea variant="faded" className="col-span-12 md:col-span-6 mb-6 md:mb-0" minRows={5} label="Message" required/>
            <Button type="submit" variant="solid" color="primary" radius="full">
                Send Message
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
                {scheduleWidget}
                {contactForm}
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