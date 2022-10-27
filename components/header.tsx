import type { NextPage } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

const Header: NextPage = () => {
  return (
    <div className={styles.navBar}>
          
          <div className={styles.links}>
            <span style={{fontStyle:"italic", marginLeft:"2vw"}}><Link href='/'>Jaxon Poentis</Link></span>
            <Link style={{textDecoration: "underline",}} target={"_blank"} href='https://www.rooseveltstem.com/'>Coding Club</Link>
            <Link style={{textDecoration: "underline"}}  href='/projects'>Project Catalog</Link>
            <Link style={{textDecoration: "underline"}}  href='/socials'>My Socials</Link>

            <Link style={{textDecoration: "underline",}}  href='/'>Home</Link>

          </div>
        </div>
  )
}

export default Header
