// import Image from "next/image"; // with the hidden portrait below
import Link from "next/link";
import { useRef } from "react";

import {
  useAboutCycle,
  useAboutScene,
  type AboutScene,
} from "../lib/aboutScene";

import { PopInBlock } from "./popinBlockContext";
import SectionHead, { HOME_COLUMN } from "./SectionHead";

const FACTS = [
  { label: "Right now", value: "Robotics Engineer · Northstar Robotics" },
  { label: "Studying", value: "CS + Math · WashU, class of '27" },
  { label: "Languages", value: "Go · C++ · Python" },
  { label: "Off the clock", value: "Hiking · Fishing · Gaming" },
];

// The lead alternates between these, in step with the background behind it.
const LEADS: Record<AboutScene, string> = {
  robots: "Get the robots out the lab.",
  infra: "Infrastructure isn't solved.",
};

const LINKS = [
  { label: "linkedin", href: "https://www.linkedin.com/in/jaxon-poentis" },
  { label: "github", href: "https://github.com/jaximus808" },
  { label: "youtube", href: "https://www.youtube.com/@jaxonpoentis" },
  { label: "x", href: "https://x.com/soljaxonp" },
];

/**
 * The first stop after the hero: a portrait and a short first-person note,
 * left-aligned like the hero. By the time it scrolls in the particle stage
 * has dissolved, so it sits on the plain dark base with no panel.
 */
export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  useAboutCycle(sectionRef);
  const scene = useAboutScene();

  return (
    <section ref={sectionRef} id="about" className="pt-24 md:pt-32 text-white">
      <SectionHead n={1} label="About" />

      {/* Portrait hidden for now (keeping it lowkey). On wide screens the
          background's dots regroup as two YAM arms in the space to the right
          (id="about" is what they track). To bring the photo back, restore the two-column
          grid, md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 md:gap-16
          lg:gap-24, and uncomment the block below. */}
      <div className={`${HOME_COLUMN} mt-12 md:mt-16`}>
        {/*
        <PopInBlock variant="materialize">
          <div className="relative mx-auto md:mx-0 aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded ring-1 ring-white/10">
            <Image
              src="/aura_pic.jpg"
              alt="Jaxon presenting a robot"
              fill
              sizes="(min-width: 768px) 420px, 90vw"
              className="object-cover"
            />
          </div>
        </PopInBlock>
        */}

        <PopInBlock variant="materialize" delay={100}>
          <div className="font-montserrat max-w-3xl">
            {/* Both lines share one grid cell, so swapping them never moves
                the text below. */}
            <p className="grid font-cormorant font-light text-4xl md:text-6xl leading-[1.1]">
              {(Object.keys(LEADS) as AboutScene[]).map((key) => (
                <span
                  key={key}
                  aria-hidden={key !== scene}
                  className={`[grid-area:1/1] transition-[opacity,transform] duration-700 ease-out ${
                    key === scene
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-1"
                  }`}
                >
                  {LEADS[key]}
                </span>
              ))}
            </p>

            <div className="mt-8 space-y-5 text-sm md:text-base font-light leading-relaxed text-white/65 max-w-xl">
              <p>
                I&apos;m a robotics engineer at Northstar Robotics, working on
                teleoperation, data pipelines, and policy fine-tuning. I also
                study CS + Math at WashU.
              </p>
              <p>
                I grew up on Oʻahu, where I led robotics teams and presented at
                ISEF. I&apos;ve also worked at Tesla, Capital One, and Spectrum.
              </p>
              <p>This site holds my work and writing.</p>
            </div>

            <dl className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6 border-t border-white/10 pt-8 max-w-xl">
              {FACTS.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[0.7rem] uppercase tracking-[0.18em] text-white/40">
                    {fact.label}
                  </dt>
                  <dd className="mt-2 text-sm font-light text-white/85">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-xs md:text-sm">
              <Link
                href="/resume"
                className="inline-flex items-center gap-2 text-blue-300/85 transition-colors duration-300 hover:text-blue-300"
              >
                resume <span aria-hidden="true">→</span>
              </Link>
              {LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/55 underline decoration-white/20 underline-offset-4 transition-colors duration-300 hover:text-blue-300 hover:decoration-blue-300/60"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </PopInBlock>
      </div>
    </section>
  );
}
