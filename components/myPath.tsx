import Image from "next/image";
import styles from "../styles/Home.module.css";
import { PopInBlock } from "./popinBlockContext";

export default function MyPath() {
  return (
    <div
      className={`md:text-left text-center pt-4 mt-16  ${styles.textContainer} s   `}
    >
      <h1
        className={`${styles.fontNormal} font-thin`}
        style={{ fontSize: "300%", textAlign: "center" }}
      >
        My Path
        {/* <span className={`${styles.fontNormal} font-light`}>{`  |  `}</span> */}
        <br></br>
        <div className="">
          <div className="mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-white h-2 "></div>
        </div>
      </h1>
      <div
        className={`grid sm:grid-cols-1 gap-x-14 gap-y-12 mt-16 w-[80%]  ${styles.centerRelX}`}
      >
        <PopInBlock>
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[9rem] w-[7rem] md:h-[9rem] md:w-[7rem] `}
              >
                <Image
                  alt="front picture"
                  src="/teslalogo.png"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>
            <div className="col-span-2 mt-2 ">
              <h1 className={"text-3xl"}>
                <strong>Tesla</strong>
              </h1>
              <h1 className={`text-xl ${styles.titleTex}`}>
                <i>Incoming Software Engineering Intern</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>Fremont, CA</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>01/2026-05/2026</i>
              </h1>

              <br></br>
              <p>
                {" "}
                Joining Tesla's Digital Experience Org as a backend Software
                Engineering Intern.
              </p>
            </div>
          </div>
        </PopInBlock>
      </div>
      <PopInBlock>
        <div>
          <div className="">
            <div className="mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-white h-8 border-x-2 rounded-b-xl"></div>
          </div>
          <div className="">
            <div className="w-1/2 border-r-2 border-white h-8"></div>
          </div>
          <div className="text-center text-xl p-4">
            <i>2026</i>
          </div>
          <div className="">
            <div className="w-1/2 border-r-2 border-white h-8"></div>
          </div>
          <div className="">
            <div className=" relative left-1/2 w-1/2 translate-x-[-50%] border-t-2 border-white h-8 border-x-2 rounded-t-xl"></div>
          </div>
        </div>
      </PopInBlock>
      <div
        className={`grid sm:grid-cols-1 gap-x-14 gap-y-12 mt-4 w-[80%]  ${styles.centerRelX}`}
      >
        <PopInBlock>
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[9rem] w-[9rem] md:h-[10rem] md:w-[10rem] `}
              >
                <Image
                  alt="front picture"
                  src="/washulogo.png"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>
            <div className="col-span-2 mt-2 ">
              <h1 className={"text-3xl"}>
                <strong>Mckelvey Engineering</strong>
              </h1>
              <h1 className={`text-xl ${styles.titleTex}`}>
                <i>System Software Teaching Assistant</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>St. Louis, MO</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>08/2025-Present</i>
              </h1>
              <br></br>
              <p>
                {" "}
                Assist Students in x86 Assembly reading, C code, and memory
                concepts.{" "}
              </p>
            </div>
          </div>
        </PopInBlock>

        <PopInBlock>
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[12rem] w-[12rem] md:h-[10.5rem] md:w-[10.5rem] `}
              >
                <Image
                  alt="front picture"
                  src="/spectrum.png"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>
            <div className="col-span-2 mt-2 ">
              <h1 className={"text-3xl"}>
                <strong>Spectrum</strong>
              </h1>
              <h1 className={`text-xl ${styles.titleTex}`}>
                <i>Software Engineering Intern</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>St. Louis, MO</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>05/2025 - 08/2025</i>
              </h1>
              <br></br>
              <p>
                Software Engineering Intern in Service Delivery Team. Worked on
                Cloud Backend Controllers in Salesforce Java
              </p>
            </div>
          </div>
        </PopInBlock>

        <PopInBlock>
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[10rem] w-[10rem] md:h-[10rem] md:w-[10rem] `}
              >
                <Image
                  alt="front picture"
                  src="/devstac.jpg"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>
            <div className="col-span-2 mt-2 ">
              <h1 className={"text-3xl"}>
                <strong>WashU IT - Devstac</strong>
              </h1>
              <h1 className={`text-xl ${styles.titleTex}`}>
                <i>Software Engineer</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>St. Louis, MO</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>04/2025 - Present</i>
              </h1>
              <br></br>
              <p>
                Building full-stack software for internal and external clients
                ranging from web-apps to mobile-apps
              </p>
            </div>
          </div>
        </PopInBlock>

        <PopInBlock>
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[9rem] w-[14rem] md:h-[8rem] md:w-[13rem] `}
              >
                <Image
                  alt="front picture"
                  src="/palantir.png"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>
            <div className="col-span-2 mt-2 ">
              <h1 className={"text-3xl"}>
                <strong>Palantir</strong>
              </h1>
              <h1 className={`text-xl ${styles.titleTex}`}>
                <i>Palantir Launch</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>Washington, DC</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>03/2025</i>
              </h1>
              <br></br>
              <p>
                Selected as a Palantir Launcher to visit their DC office and
                learn more about the company.{" "}
              </p>
            </div>
          </div>
        </PopInBlock>
      </div>
      <PopInBlock>
        <div>
          <div className="">
            <div className="mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-white h-8 border-x-2 rounded-b-xl"></div>
          </div>
          <div className="">
            <div className="w-1/2 border-r-2 border-white h-8"></div>
          </div>
          <div className="text-center text-xl p-4">
            <i>2025</i>
          </div>
          <div className="">
            <div className="w-1/2 border-r-2 border-white h-8"></div>
          </div>
          <div className="">
            <div className=" relative left-1/2 w-1/2 translate-x-[-50%] border-t-2 border-white h-8 border-x-2 rounded-t-xl"></div>
          </div>
        </div>
      </PopInBlock>
      <div
        className={`grid sm:grid-cols-1 gap-x-14 gap-y-12 mt-4 w-[80%]  ${styles.centerRelX}`}
      >
        <PopInBlock>
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[10rem] w-[12rem] md:h-[8rem] md:w-[10rem]  `}
              >
                <Image
                  alt="front picture"
                  src="/healthxr.png"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>

            <div className="col-span-2 mt-2 ">
              <h1 className={"text-3xl"}>
                <strong>Health XR</strong>
              </h1>
              <h1 className={`text-xl ${styles.titleTex}`}>
                <i>Founding Software Engineer</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>St. Louis, MO</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>09/2024 - 01/2025</i>
              </h1>
              <br></br>
              <p>
                Developed the first prototype of Meta Quest XR Healthcare
                assistant within Unity + C#, winning #1 at St. Louis startup
                tech week.
              </p>
            </div>
          </div>
        </PopInBlock>
        <PopInBlock>
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[10rem] w-[14rem] md:h-[8rem] md:w-[11rem] `}
              >
                <Image
                  alt="front picture"
                  src="/flashcardify.png"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>

            <div className="col-span-2 mt-2 ">
              <h1 className={"text-3xl"}>
                <strong>Flashcardify.ai</strong>
              </h1>
              <h1 className={`text-xl ${styles.titleTex}`}>
                <i>Software Engineering Intern</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>St. Louis, MO</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>09/2024 - 01/2025</i>
              </h1>
              <br></br>
              <p>
                Built-out backend infrastructure for flashcard decks with
                Node.js and Supabase{" "}
              </p>
            </div>
          </div>
        </PopInBlock>

        <PopInBlock>
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[9rem] w-[9rem] md:h-[10rem] md:w-[10rem] `}
              >
                <Image
                  alt="front picture"
                  src="/washulogo.png"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>
            <div className="col-span-2 mt-2 ">
              <h1 className={"text-3xl"}>
                <strong>Mckelvey Engineering</strong>
              </h1>
              <h1 className={`text-xl ${styles.titleTex}`}>
                <i>Data Structures and Algorithms Teaching Assistant</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>St. Louis, MO</i>
              </h1>
              <h1 className={`text-md ${styles.dateRangeTex}`}>
                <i>01/2025-12/2025</i>
              </h1>
              <br></br>
              <p>
                {" "}
                Assisted students in developing data structures, implementation
                of algorithms, and runtime analysis.{" "}
              </p>
            </div>
          </div>
        </PopInBlock>
      </div>
      <PopInBlock>
        <div>
          <div className="">
            <div className="mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-white h-8 border-x-2 rounded-b-xl"></div>
          </div>

          <div className="">
            <div className="w-1/2 border-r-2 border-white h-8"></div>
          </div>
          <div className="text-center text-xl p-4">
            <i>2024</i>
          </div>
          <div className="">
            <div className="w-1/2 border-r-2 border-white h-8"></div>
          </div>
          <div className="">
            <div className=" relative left-1/2 w-1/2 translate-x-[-50%] border-t-2 border-white h-8 border-x-2 rounded-t-xl"></div>
          </div>
        </div>
      </PopInBlock>

      <PopInBlock>
        <div
          className={`grid sm:grid-cols-1 gap-x-14 gap-y-12 mt-4 w-[80%]  ${styles.centerRelX}`}
        >
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[10rem] w-[10rem] md:h-[8rem] md:w-[8rem] `}
              >
                <Image
                  alt="front picture"
                  src="/fiverrlogo.jpg"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>

            <div className="col-span-2 mt-2 ">
              <h1 className={"text-3xl"}>
                <strong>Fiverr</strong>
              </h1>
              <h1 className={`text-xl ${styles.titleTex}`}>
                <i>Freelance Software Developer</i>
              </h1>
              <h1 className={`text-lg ${styles.dateRangeTex}`}>
                <i>03/2023 - 09/2023</i>
              </h1>
              <br></br>
              Earned over $1000 through my gig of creating full stack web
              browser games with Node.js, Socket.io, React, + more.
            </div>
          </div>
        </div>
      </PopInBlock>
      <PopInBlock>
        <div>
          <div className="">
            <div className="mt-4 relative left-1/2 w-1/2 translate-x-[-50%] border-b-2 border-white h-8 border-x-2 rounded-b-xl"></div>
          </div>

          <div className="">
            <div className="w-1/2 border-r-2 border-white h-16"></div>
          </div>
          <div className="text-center text-xl p-4">
            <i>2023</i>
          </div>
          <div className="">
            <div className="w-1/2 border-r-2 border-white h-16"></div>
          </div>
        </div>
      </PopInBlock>
      <PopInBlock>
        <div
          className={`${styles.fadedBg} rounded-xl p-8 mt-4 w-2/3 text-center relative left-1/2 translate-x-[-50%]`}
        >
          <h1 className={"text-3xl"}>
            <strong>A Lifelong Journey of Learning</strong>
          </h1>
          <h1 className={`text-xl ${styles.titleTex}`}>
            <i>Aspiring Software Engineer</i>
          </h1>
          <h1 className={`text-lg ${styles.dateRangeTex}`}>
            <i>2019 - Present</i>
          </h1>
          <br></br>
          <p className="w-4/5 mx-auto">
            What began as a simple curiosity for making a video game during the
            Covid-19 pandemic has ignited my passion for all things software,
            and a lifelong drive to keep learning and building.
          </p>
        </div>
      </PopInBlock>
      <PopInBlock>
      <div>
        <div className="">
          <div className="mt-2 w-1/2 border-r-2 border-white h-16"></div>
        </div>
        <div className="">
          <div className="relative left-1/2 w-16 translate-x-[-50%] h-16 border-2 border-white rounded-full">
            <div className="relative left-1/2 top-1/2 w-16 translate-x-[-50%] translate-y-[-50%] text-center">
              🌺
            </div>
          </div>
        </div>
      </div>
      </PopInBlock>
    </div>
  );
}
