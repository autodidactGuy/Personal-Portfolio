import { basePath, siteConfig } from "@/config/site";
import DefaultLayout from "@/layouts/default";
import {Accordion, AccordionItem, Card, CardBody, CardHeader, Image} from "@nextui-org/react";
import NextImage from "next/image";
import { BiSolidUserAccount } from "react-icons/bi";
import { FaAmazon, FaUserGraduate } from "react-icons/fa6";
import { MdWork } from "react-icons/md";


export default function About() {
    return (
        <DefaultLayout>
			<section className="flex flex-col lg:flex-row justify-center gap-4 py-8 max-w-screen-lg m-auto">
                 <Card className="flex-none h-fit pb-4 animate__animated animate__fadeInUp ">
                    <CardBody className="bg-white bordered items-center">
                        <Image
                        as={NextImage}
                        alt="About Me"
                        className="object-cover rounded-xl"
                        src={`${basePath}/favicon.png`}
                        width={300}
                        height={300}
                        />
                    </CardBody>
                    <CardHeader className="pb-0 pt-3 px-4 flex-col items-center">
                        <h3 className="font-bold text-5xl leading-tight">{siteConfig.name}</h3>
                        <p className="font-bold font-sm">{siteConfig.slogan}</p>
                    </CardHeader>
                </Card>
                <Accordion variant="splitted">
                    <AccordionItem
                        key="1"
                        startContent={<BiSolidUserAccount size={35}/>}
                        aria-label="About Me"
                        className="animate__animated animate__fadeInUp "
                        title="About Me"
                        subtitle={
                            <p className="flex">
                                A good human being 
                            </p>
                        }>
                        <div className="flex flex-col gap-3 places-items-center w-full mb-2 text-justify">
                            <p className="pl-1 mb-2 text-base md:text-lg">Experienced software engineer with a diverse skill set and a proven track record of contributing to innovative solutions in the field. With a solid foundation in Java, JavaScript, TypeScript, and a wealth of experience in Spring Boot, Java, TypeScript, Node.js, React.js, RESTful APIs, Microservices, Angular, PHP, Laravel. I have consistently delivered high-quality software solutions. My recent role as a Software Development Engineer II at Amazon allowed me to deepen my expertise in cloud technologies, particularly Amazon Web Services (AWS), where I worked extensively with services like AWS Pipelines, Lambdas, EC2, SQS, SES, and API Gateways. I also honed my skills in managing NoSQL databases, including DynamoDB, to efficiently handle large datasets. This experience enabled me to thrive in a fast-paced environment and create solutions that scaled seamlessly while meeting the complexity of diverse workflows and regional regulations.<br/><br />Beyond my technical expertise, I am passionate about exploring cutting-edge technologies, especially in the realm of artificial intelligence. During my academic journey, I undertook a significant final year project focused on AI and its practical applications. I continue to stay abreast of the latest developments in AI, which informs my approach to problem-solving and innovation. Outside of my professional pursuits, I nurture a keen interest in astronomy and the captivating history of space and time. I find the possibilities of what lies beyond our planet to be endlessly fascinating and enjoy delving into this field during my spare time. I have a genuine eagerness for continuous learning and personal growth, both professionally and personally. My unique blend of skills, hands-on experience, and unwavering passion positions me as an ideal candidate for roles in software development and engineering. I look forward to contributing my expertise to exciting projects that drive innovation and make a meaningful impact in the industry.</p>
                        </div>
                    </AccordionItem>
                    <AccordionItem
                        key="2"
                        startContent={<MdWork size={35}/>}
                        aria-label="Experience"
                        className="animate__animated animate__fadeInUp "
                        title="Experience"
                        subtitle={
                            <p className="flex">
                                Innovative Full Stack Engineer
                            </p>
                        }>
                        {siteConfig.experience.map((item, index) => (
                            <Card className="mb-4 py-4 shadow-none border" key={`${item}-${index}`}>
                                <CardHeader className="py-2 px-4 flex flex-col md:flex-row gap-5 items-start">
                                    <div className="">
                                        <Image
                                            as={NextImage}
                                            alt={item.company}
                                            className="object-cover rounded-xl bg-white border p-2"
                                            src={item.image}
                                            width={70}
                                            height={70}
                                        />
                                    </div>
                                    <div>
                                        <p className="font-bold text-xl leading-none">{item.title}</p>
                                        <p className="text-lg font-bold text-primary">{item.company} <span className="font-normal italic text-sm text-foreground">{item.companyComments && `(${item.companyComments})`}</span><span className="font-normal text-foreground"> - {item.location}</span></p>
                                        <p className="text-sm">{item.from} - {item.to}</p>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                    </AccordionItem>
                    <AccordionItem
                        key="3"
                        startContent={<FaUserGraduate size={35}/>}
                        aria-label="Education"
                        className="animate__animated animate__fadeInUp "
                        title="Education"
                        subtitle={
                            <p className="flex">
                                Educational Odyssey
                            </p>
                        }>
                        {siteConfig.education.map((item, index) => (
                            <Card className="mb-4 py-4 shadow-none border" key={`${item}-${index}`}>
                                <CardHeader className="py-2 px-4 flex flex-col md:flex-row gap-5 items-start">
                                    <div className="">
                                        <Image
                                            as={NextImage}
                                            alt={item.institute}
                                            className="object-cover rounded-xl bg-white border p-2"
                                            src={item.image}
                                            width={70}
                                            height={70}
                                        />
                                    </div>
                                    <div>
                                        <p className="font-bold text-xl leading-none">{item.degree} - <span className="font-normal italic">{item.result}</span></p>
                                        <p className="text-lg font-bold text-primary">{item.institute}<span className="font-normal text-foreground"> - {item.location}</span></p>
                                        <p className="text-sm">{item.from} - {item.to}</p>
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