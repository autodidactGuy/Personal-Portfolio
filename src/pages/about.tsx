import type { GetStaticProps } from "next";

import NextImage from "next/image";
import { Accordion, AccordionItem, Card, CardBody, CardHeader, Image } from "@nextui-org/react";
import { BiSolidUserAccount } from "react-icons/bi";
import { FaUserGraduate } from "react-icons/fa6";
import { MdWork } from "react-icons/md";

import { siteConfig, withBasePath } from "@/config/site";
import { getAboutProfile, getEducation, getExperience } from "@/lib/content";
import DefaultLayout from "@/layouts/default";
import type { AboutProfile, EducationItem, ExperienceItem } from "@/types/content";

type AboutPageProps = {
  profile: AboutProfile;
  experience: ExperienceItem[];
  education: EducationItem[];
};

export default function About({ profile, experience, education }: AboutPageProps) {
  return (
    <DefaultLayout>
      <section className="m-auto flex max-w-screen-lg flex-col gap-4 py-8 lg:flex-row">
        <Card className="animate__animated animate__fadeInUp flex-none h-fit pb-4">
          <CardBody className="items-center bg-white">
            <Image
              as={NextImage}
              alt="About Me"
              className="rounded-xl object-cover"
              src={withBasePath(profile.photo)}
              width={300}
              height={300}
            />
          </CardBody>
          <CardHeader className="flex-col items-center px-4 pb-0 pt-3">
            <h3 className="text-center text-5xl font-bold leading-tight">{siteConfig.name}</h3>
            <p className="text-center font-bold">{profile.headline}</p>
          </CardHeader>
        </Card>
        <Accordion variant="splitted">
          <AccordionItem
            key="about"
            startContent={<BiSolidUserAccount size={35} />}
            aria-label="About Me"
            className="animate__animated animate__fadeInUp"
            title="About Me"
            subtitle={<p className="flex">{profile.summary}</p>}
          >
            <div className="mb-2 flex w-full flex-col gap-4 text-justify">
              {profile.body.map((paragraph) => (
                <p key={paragraph} className="pl-1 text-base md:text-lg">
                  {paragraph}
                </p>
              ))}
            </div>
          </AccordionItem>
          <AccordionItem
            key="experience"
            startContent={<MdWork size={35} />}
            aria-label="Experience"
            className="animate__animated animate__fadeInUp"
            title="Experience"
            subtitle={<p className="flex">Innovative Full Stack Engineer</p>}
          >
            {experience.map((item) => (
              <Card className="mb-4 border py-4 shadow-none" key={`${item.company}-${item.title}`}>
                <CardHeader className="flex flex-col items-start gap-5 px-4 py-2 md:flex-row">
                  <Image
                    as={NextImage}
                    alt={item.company}
                    className="rounded-xl border bg-white p-2 object-cover"
                    src={withBasePath(item.image)}
                    width={70}
                    height={70}
                  />
                  <div>
                    <p className="text-xl font-bold leading-none">{item.title}</p>
                    <p className="text-lg font-bold text-primary">
                      {item.company}
                      {item.companyComments ? (
                        <span className="ml-1 text-sm font-normal italic text-foreground">({item.companyComments})</span>
                      ) : null}
                      <span className="font-normal text-foreground"> - {item.location}</span>
                    </p>
                    <p className="text-sm">
                      {item.from} - {item.to}
                    </p>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </AccordionItem>
          <AccordionItem
            key="education"
            startContent={<FaUserGraduate size={35} />}
            aria-label="Education"
            className="animate__animated animate__fadeInUp"
            title="Education"
            subtitle={<p className="flex">Educational Odyssey</p>}
          >
            {education.map((item) => (
              <Card className="mb-4 border py-4 shadow-none" key={`${item.institute}-${item.degree}`}>
                <CardHeader className="flex flex-col items-start gap-5 px-4 py-2 md:flex-row">
                  <Image
                    as={NextImage}
                    alt={item.institute}
                    className="rounded-xl border bg-white p-2 object-cover"
                    src={withBasePath(item.image)}
                    width={70}
                    height={70}
                  />
                  <div>
                    <p className="text-xl font-bold leading-none">
                      {item.degree} - <span className="font-normal italic">{item.result}</span>
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {item.institute}
                      <span className="font-normal text-foreground"> - {item.location}</span>
                    </p>
                    <p className="text-sm">
                      {item.from} - {item.to}
                    </p>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </AccordionItem>
        </Accordion>
      </section>
    </DefaultLayout>
  );
}

export const getStaticProps: GetStaticProps<AboutPageProps> = async () => {
  return {
    props: {
      profile: getAboutProfile(),
      experience: getExperience(),
      education: getEducation(),
    },
  };
};
