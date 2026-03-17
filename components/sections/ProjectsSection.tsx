import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import styles from "../../styles/Home.module.css";
import { PopInBlock } from "../popinBlockContext";
import YoutubeEmbed from "../YoutubeEmbed";

interface ProjectsSectionProps {
  pastProjFav: any[] | undefined;
}

export default function ProjectsSection({ pastProjFav }: ProjectsSectionProps) {
  return (
    <div className={`${styles.textContainer} py-4 text-white mt-16`}>
      <Link href={"/projects"}>
        <h1
          className="font-thin"
          style={{ fontSize: "400%", textAlign: "center", cursor: "pointer" }}
        >
          My Recent Projects 🧑‍💻
        </h1>
      </Link>
      <div className="">
        <div className="mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-white h-2"></div>
      </div>
      <div className="mt-4 flex items-center justify-center">
        {pastProjFav ? (
          pastProjFav.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 flex mt-4 gap-8 md:gap-4 lg:gap-4 p-4 px-8 max-w-[90rem]">
              {pastProjFav.map((data: any) => (
                <PopInBlock key={data.id}>
                  <div key={data.id} className="h-full w-full flex justify-center">
                    <div className="max-w-[80rem]">
                      <div
                        onClick={() => {
                          window.location.href = `/projects/${data.name}`;
                        }}
                        className={`${styles.projectContainerText} ${styles.gradent} rounded-lg py-12 px-4 bg-[#343434] cursor-pointer`}
                        style={{ textAlign: "left" }}
                      >
                        <div className="">
                          {data.youtube ? (
                            <div className={`${styles.journeyImage} md:w-full`}>
                              <Suspense fallback={<h3>loading</h3>}>
                                <YoutubeEmbed
                                  className={"h-[40vw] md:h-[18vw]"}
                                  vId={data.mediaLink}
                                />
                              </Suspense>
                            </div>
                          ) : (
                            <div
                              className={`${styles.journeyImage} w-[15rem] sm:w-96 h-36 sm:h-72`}
                            >
                              <Image
                                alt="front picture"
                                src={data.mediaLink}
                                fill
                                style={{ borderRadius: "0.5rem" }}
                              />
                            </div>
                          )}
                          <div className="px-6 mt-4">
                            <h2
                              className="text-3xl font-bold font-italic mt-2"
                              style={{
                                overflowWrap: "break-word",
                                cursor: "pointer",
                                textDecoration: "",
                              }}
                            >
                              {data.name.replace(/_/g, " ")}
                            </h2>
                            <h3
                              className={`text-md mt-4 italic`}
                              style={{
                                overflow: "hidden",
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: "vertical",
                                display: "-webkit-box",
                              }}
                            >
                              {data.projectDate}
                            </h3>
                            <h3
                              className={`text-md mt-4`}
                              style={{
                                overflow: "hidden",
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: "vertical",
                                display: "-webkit-box",
                              }}
                            >
                              {data.shortDescription}
                            </h3>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </PopInBlock>
              ))}
            </div>
          ) : (
            <PopInBlock>
              <h3 className="text-center text-3xl">
                Sorry Projects Could Not Be Loaded, Try Again!
              </h3>
            </PopInBlock>
          )
        ) : (
          <PopInBlock>
            <h3 className="text-center text-3xl">Loading...</h3>
          </PopInBlock>
        )}
      </div>
    </div>
  );
}
