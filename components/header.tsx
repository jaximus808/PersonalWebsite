import Link from 'next/link'
import { useState, useEffect } from 'react'

type HeaderProps = {
  /** Landing page: stay out of the way until the hero has scrolled off, so
      the name isn't shown twice. */
  hideOnHero?: boolean
}

const NAV = [
  { href: '/projects', label: 'projects' },
  { href: '/blog', label: 'blog' },
]

/**
 * A quiet bar on the same 6xl column as the home sections: the name in
 * Cormorant, plain mono links like the hero's. It frosts what scrolls under
 * it instead of cutting it off, and its hairline only shows once you scroll.
 */
const Header = ({ hideOnHero = false }: HeaderProps) => {

  const [scrolled, setScrolled] = useState(false)
  const [pastHero, setPastHero] = useState(!hideOnHero)

  useEffect(() =>
  {
      const handleScroll = () =>
      {
          const y = window.scrollY
          const h = window.innerHeight
          setScrolled(y > 8)
          if (hideOnHero) setPastHero(y > h*0.6)
      }
      handleScroll()
      window.addEventListener("scroll", handleScroll, { passive: true })
      return () =>
      {
          window.removeEventListener("scroll", handleScroll)
      }

  },[hideOnHero])

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b bg-[#121212]/70 backdrop-blur-md transition-[opacity,visibility,border-color] duration-500 ease-out ${
          scrolled ? 'border-white/[0.07]' : 'border-transparent'
        } ${pastHero ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
      >
        <div className='mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6 md:px-12'>
          <Link
            href='/'
            className='font-cormorant font-light text-2xl tracking-[0.01em] text-white transition-colors duration-300 hover:text-blue-300'
          >
            Jaxon Poentis
          </Link>
          <nav aria-label='Site' className='flex items-center gap-6 font-mono text-xs md:text-sm'>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className='text-white/55 transition-colors duration-300 hover:text-blue-300'
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {/* Spacer under the fixed bar; the landing hero fills the screen itself. */}
      {!hideOnHero && <div className='h-14' />}
    </>
  )
}

export default Header
