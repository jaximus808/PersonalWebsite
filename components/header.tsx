import Link from 'next/link'
import styles from '../styles/Home.module.css'
import { useState, useEffect } from 'react'

type HeaderProps = {
  /** Landing page: stay out of the way until the hero has scrolled off, so
      the name isn't shown twice. */
  hideOnHero?: boolean
}

const Header = ({ hideOnHero = false }: HeaderProps) => {

  const [mini, setMini] = useState(false)
  const [pastHero, setPastHero] = useState(!hideOnHero)

  useEffect(() =>
  {
      const handleScroll = () =>
      {
          const y = window.scrollY
          const h = window.innerHeight
          setMini(y > h*0.10)
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
      <div
        className={`${mini ? styles.navBarMini : styles.navBar} ${
          pastHero ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
          
          <div className={`${styles.links} relative top-1/2 translate-y-[-50%]`}>
            <span className={styles.homeLink} style={{ marginLeft:"2vw"}}>
              <Link href='/' className='text-3xl font-cormorant font-light tracking-[0.01em]'>Jaxon Poentis</Link>

              </span>
            <Link className='text-lg mt-1 font-cormorant font-light' replace href='/projects'>Projects</Link>
            <Link className='text-lg mt-1 font-cormorant font-light' replace  href='/blog'>Blog</Link>
    
    
          </div>
        </div>
        {/* Spacer under the fixed bar; the landing hero fills the screen itself. */}
        {!hideOnHero && <div className={styles.navBarHolder} />}
    </>
    
    
  )
}

export default Header
