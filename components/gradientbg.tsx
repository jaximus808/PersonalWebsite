import css from "../styles/Home.module.css"
import React, { useRef } from 'react'
import { useHeroFade } from "../lib/useHeroFade"

export default function GradientBG({ fadeOnScroll = false }: { fadeOnScroll?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  // On the landing page the orbs leave with the hero (see useHeroFade).
  useHeroFade((p) => {
    if (ref.current) ref.current.style.opacity = String(0.4 * (1 - p))
  }, fadeOnScroll)

  return (
    <div ref={ref} className="fixed top-0 left-0 w-full h-full opacity-40 -z-50">

      <div className={`${css.gradientorb} ${css.orb1}`}></div>
      <div className={`${css.gradientorb} ${css.orb2}`}></div>
      <div className={`${css.gradientorb} ${css.orb3}`}></div>
    </div>
  )
}
