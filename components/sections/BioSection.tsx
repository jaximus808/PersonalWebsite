import Image from "next/image";
import Link from "next/link";
import styles from "../../styles/Home.module.css";
import { PopInBlock } from "../popinBlockContext";

export default function BioSection() {
  return (
    <div
      className={`grid md:grid-cols-2 w-full h-full py-4 relative left-1/2 translate-x-[-50%] gap-x-8 bg-[#121212]`}
    >
      <PopInBlock>
        <div
          className={`${styles.frontImage} mt-2 md:ml-10 w-[280px] h-[392px] md:w-[320px] md:h-[448px] lg:w-[380px] lg:h-[532px] xl:w-[480px] xl:h-[672px] 2xl:w-[580px] 2xl:h-[812px]`}
        >
          <Image
            alt="front picture"
            src="/aura_pic.jpg"
            fill
            className="rounded-md object-cover"
          />
        </div>
      </PopInBlock>

      <PopInBlock>
        <div className={`w-full flex px-4 md:p-0 mt-4 md:mt-0`}>
          <div className={`${styles.fadedBg} p-6 rounded-xl md:w-[87%]`}>
            <h2
              className={`${styles.fontNormal} text-2xl xl:text-3xl 2xl:text-4xl md:text-left text-center`}
            >
              Hey, I'm Jaxon 🤙
            </h2>
            <h2
              className={`${styles.fontNormal} font-semithin text-md xl:text-lg 2xl:text-xl mt-5 md:text-left text-center`}
            >
              Born and Raised Hawaii, island of O'ahu, I'm currently studying CS
              + Math at Washington University in St. Louis, with a focus on
              backend development and robotic systems.{" "}
            </h2>
            <h2
              className={`${styles.fontNormal} font-thin text-lg xl:text-xl 2xl:text-2xl mt-5 md:text-left text-center`}
            >
              <span className="underline">Hobbies</span>: Coding, Hiking,
              Fishing, Gaming
            </h2>
            <h2
              className={`${styles.fontNormal} font-thin text-lg xl:text-xl 2xl:text-2xl mt-2 md:text-left text-center`}
            >
              <span className="underline">Fav Languages</span>: Go, C++, Python
            </h2>
            <br></br>
            <p
              className={`${styles.fontNormal} font-thin xl:text-lg 2xl:text-xl text-center md:text-left`}
            >
              If my webpage is too long, checkout my resume:
            </p>
            <div className="w-full text-center md:text-left">
              <Link
                className="underline text-blue-300 xl:text-lg 2xl:text-xl"
                href={"./resume"}
              >
                📘 Resume
              </Link>
            </div>

            <br></br>
            <h1
              className={`${styles.fontNormal} text-2xl xl:text-3xl 2xl:text-4xl md:text-left text-center`}
            >
              Connect With Me 👋
            </h1>

            <div className="mt-8 pb-8 mx-auto w-full md:w-auto">
              <ul className="space-y-4 md:text-left text-center underline xl:text-lg 2xl:text-xl">
                <li className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/LinkedIn_icon.png"
                      alt="LinkedIn"
                      width={24}
                      height={24}
                      className="object-contain xl:w-7 xl:h-7 2xl:w-8 2xl:h-8"
                    />
                    <Link
                      className="underline"
                      href={"https://www.linkedin.com/in/jaxon-poentis"}
                    >
                      LinkedIn
                    </Link>
                  </div>
                </li>

                <li className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/youlogo.png"
                      alt="YouTube"
                      width={24}
                      height={24}
                      className="object-contain xl:w-7 xl:h-7 2xl:w-8 2xl:h-8"
                    />
                    <Link
                      className="underline"
                      href={"https://www.linkedin.com/in/jaxon-poentis"}
                    >
                      Youtube
                    </Link>
                  </div>
                </li>

                <li className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/githublogo.png"
                      alt="GitHub"
                      width={24}
                      height={24}
                      className="rounded-full object-contain xl:w-7 xl:h-7 2xl:w-8 2xl:h-8"
                    />
                    <Link
                      className="underline"
                      href={"https://www.linkedin.com/in/jaxon-poentis"}
                    >
                      Github
                    </Link>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </PopInBlock>

      <div id="path"></div>
    </div>
  );
}
