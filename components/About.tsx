import Image from "next/image";
import Link from "next/link";

import { PopInBlock } from "./popinBlockContext";
import SectionHead, { HOME_COLUMN } from "./SectionHead";

const FACTS = [
  { label: "Right now", value: "Robotics SWE · Northstar Robotics" },
  { label: "Studying", value: "CS + Math · WashU, class of '27" },
  { label: "Languages", value: "Go · C++ · Python" },
  { label: "Off the clock", value: "Hiking · Fishing · Gaming" },
];

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
  return (
    <section className="pt-24 md:pt-32 text-white">
      <SectionHead n={1} label="About" />

      <div
        className={`${HOME_COLUMN} mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 md:gap-16 lg:gap-24`}
      >
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

        <PopInBlock variant="materialize" delay={100}>
          <div className="font-montserrat">
            <p className="font-cormorant font-light text-3xl md:text-4xl xl:text-[2.6rem] leading-[1.2] [text-wrap:balance]">
              Hey, I&apos;m Jaxon. I build robots, and the infrastructure
              underneath them.
            </p>

            <div className="mt-8 space-y-5 text-sm md:text-base font-light leading-relaxed text-white/65 max-w-xl">
              <p>
                Born and raised on Oʻahu. I study CS + Math at Washington
                University in St. Louis, with a focus on backend systems and
                robotics.
              </p>
              <p>
                Right now I&apos;m a robotics software engineer at Northstar
                Robotics, working on teleoperation, data pipelines, and policy
                fine-tuning. Before that I was at Tesla, Capital One, and
                Spectrum.
              </p>
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
