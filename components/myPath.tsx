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
                className={`${styles.journeyImage} h-[9rem] w-[7rem] md:h-[8rem] md:w-[6rem] `}
              >
                <Image
                  alt="front picture"
                  src="/teslalogo.png"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>
            <div className="col-span-2 mt-4 md:mt-2 ">
              <h1 className={"text-2xl"}>
                <strong>Tesla</strong>
              </h1>
              <h1 className={`text-lg ${styles.titleTex}`}>
                <i>Software Engineering Intern</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>Fremont, CA</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>01/2026</i>
              </h1>

              <p className="mt-2">
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
        className={`grid sm:grid-cols-1 gap-x-14 gap-y-8 mt-4 w-[80%]  ${styles.centerRelX}`}
      >
        <PopInBlock>
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[9rem] w-[9rem] md:h-[8rem] md:w-[14rem]  `}
              >
                <Image
                  alt="front picture"
                  src="/mck_logo_2.png"
                  fill
                  className="bg-white"
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>
            <div className="col-span-2 mt-4 md:mt-2 ">
              <h1 className={"text-2xl"}>
                <strong>WashU Mckelvey Engineering</strong>
              </h1>
              <h1 className={`text-lg ${styles.titleTex}`}>
                <i>System Software Teaching Assistant</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>St. Louis, MO</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>08/2025-Present</i>
              </h1>
              <p className="mt-2">
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
                className={`${styles.journeyImage} h-[12rem] w-[12rem] md:h-[8.5rem] md:w-[8.5rem] `}
              >
                <Image
                  alt="front picture"
                  src="/spectrum.png"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>
            <div className="col-span-2 mt-4 md:mt-2 ">
              <h1 className={"text-2xl"}>
                <strong>Spectrum</strong>
              </h1>
              <h1 className={`text-lg ${styles.titleTex}`}>
                <i>Software Engineering Intern</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>St. Louis, MO</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>05/2025 - 08/2025</i>
              </h1>
              <p className="mt-2">
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
                className={`${styles.journeyImage} h-[9rem] w-[9rem] md:h-[8rem] md:w-[8rem] `}
              >
                <Image
                  alt="front picture"
                  src="/devstac.jpg"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>
            <div className="col-span-2 mt-4 md:mt-2 ">
              <h1 className={"text-2xl"}>
                <strong>WashU IT - Devstac</strong>
              </h1>
              <h1 className={`text-lg ${styles.titleTex}`}>
                <i>Software Engineer</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>St. Louis, MO</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>04/2025 - Present</i>
              </h1>
              <p className="mt-2">
                Building full-stack software for internal and external clients
                ranging from web-apps to mobile-apps
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-200">
                  More Info
                </summary>
                <div className=" p-2 mt-2 rounded-md">
                  <p className="underline">Key Skills:</p>
                  <ul className="list-disc ml-5">
                    <li>Node.js + Typescript</li>
                    <li>API Development</li>
                    <li>Supabase Database</li>
                    <li>React</li>
                  </ul>
                </div>
              </details>
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
        className={`grid sm:grid-cols-1 gap-x-14 gap-y-8 mt-4 w-[80%]  ${styles.centerRelX}`}
      >
        <PopInBlock>
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[8rem] w-[10rem] md:h-[7rem] md:w-[9rem]  `}
              >
                <Image
                  alt="front picture"
                  src="/healthxr.png"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>

            <div className="col-span-2 mt-4 md:mt-2 ">
              <h1 className={"text-2xl"}>
                <strong>Health XR</strong>
              </h1>
              <h1 className={`text-lg ${styles.titleTex}`}>
                <i>Founding Software Engineer</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>St. Louis, MO</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>09/2024 - 01/2025</i>
              </h1>
              <p className="mt-2">
                Developed the first prototype of Meta Quest XR Healthcare
                assistant within Unity + C#, winning #1 at St. Louis startup
                tech week.
              </p>
               <details className="mt-2">
                <summary className="cursor-pointer text-blue-200">
                  More Info
                </summary>
                <div className=" p-2 mt-2 rounded-md">
                  <p className="underline">Key Features Built:</p>
                  <ul className="list-disc ml-5">
                    <li>Created Intergrated Reality Env. in Unity </li>
                    <li>Added wrist button in virtual world that integrates with FastAPI backend</li>
                    <li>Rendered AI analysis of Medial Document onto 3D world</li>
                  </ul>
                </div>
              </details>
            </div>
          </div>
        </PopInBlock>
        <PopInBlock>
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[8rem] w-[12rem] md:h-[8rem] md:w-[12rem] `}
              >
                <Image
                  alt="front picture"
                  src="/flashcardify.png"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>

            <div className="col-span-2 mt-4 md:mt-2 ">
              <h1 className={"text-2xl"}>
                <strong>Flashcardify.ai</strong>
              </h1>
              <h1 className={`text-lg ${styles.titleTex}`}>
                <i>Software Engineering Intern</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>St. Louis, MO</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>09/2024 - 01/2025</i>
              </h1>
              <p className="mt-2">
                Built-out backend infrastructure for flashcard decks with
                Node.js and Supabase{" "}
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-200">
                  More Info
                </summary>
                <div className=" p-2 mt-2 rounded-md">
                  <p className="underline">Key Features Built:</p>
                  <ul className="list-disc ml-5">
                    <li>Deck privacy controls (public/private visibility)</li>
                    <li>Full-text search functionality using Supabase</li>
                    <li>Tagging system for deck organization and discovery</li>
                    <li>Search matching by deck names and metadata</li>
                  </ul>
                </div>
              </details>
            </div>
          </div>
        </PopInBlock>

        <PopInBlock>
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[9rem] w-[9rem] md:h-[8rem] md:w-[14rem] `}
              >
                <Image
                  alt="front picture"
                  src="/mck_logo_2.png"
                  fill
                  className="bg-white"
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>
            <div className="col-span-2 mt-4 md:mt-2 ">
              <h1 className={"text-2xl"}>
                <strong>WashU Mckelvey Engineering</strong>
              </h1>
              <h1 className={`text-lg ${styles.titleTex}`}>
                <i>Data Structures and Algorithms Teaching Assistant</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>St. Louis, MO</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>01/2025-12/2025</i>
              </h1>
              <p className="mt-2">
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
          className={`grid sm:grid-cols-1 gap-x-14 gap-y-12 mt-4 w-[80%]  ${styles.centerRelX} `}
        >
          <div
            className={`${styles.fadedBg} grid grid-cols-1 md:grid-cols-3 p-4 rounded-xl`}
          >
            <div className="col-span-3 text-center text-3xl font-thin mb-4 flex justify-center">
              <div className="w-1/2 border-b-2 pb-2">Education</div>
            </div>
            <div className="flex items-center">
              <div
                className={`${styles.journeyImage} h-[8rem] w-[8rem] md:h-[9rem] md:w-[9rem] `}
              >
                <Image
                  alt="front picture"
                  src="/washulogo.png"
                  fill
                  style={{ borderRadius: "0.5rem" }}
                />
              </div>
            </div>

            <div className="col-span-2 mt-4 md:mt-2 ">
              <h1 className={"text-2xl"}>
                <strong>Washington University in St. Louis</strong>
              </h1>
              <h1 className={`text-lg ${styles.titleTex}`}>
                <i>Bachelor in Science, CS + Math, and Entrepnuership</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>GPA: 3.76</i>
              </h1>
              <h1 className={`text-sm ${styles.dateRangeTex}`}>
                <i>08/2023 - Expected: 05/2027</i>
              </h1>
              <p className="mt-2">
                Pursuing CS + Math with a focus on systems and algorithms,
                involved in entrepreneurship and student organizations on
                campus.
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-200">
                  Notable classes + Clubs
                </summary>
                <div className=" p-2 mt-2 rounded-md">
                  <p className="underline">Notable Classes:</p>
                  <ul className="list-disc ml-5">
                    <li>Cloud Computing</li>
                    <li>Intro to Cryptography</li>
                    <li>System Software</li>
                    <li>Parallel and Concurrent Programming</li>
                    <li>Linear Algebra (proof-based)</li>
                    <li>Object-Oriented Programming (C++)</li>
                  </ul>

                  <p className="mt-4 underline">Campus Involvement:</p>
                  <ul className="list-disc ml-5">
                    <li>WashU Robotics (Project Lead)</li>
                    <li>Google Developer Group (Core Lead)</li>
                    <li>LNYF (MultiMedia)</li>
                  </ul>
                </div>
              </details>
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
