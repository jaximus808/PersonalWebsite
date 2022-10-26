import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

const Header: NextPage = () => {
  return (
    <div className={styles.navBar}>
          
          <div className={styles.links}>
            <span style={{fontStyle:"italic", marginLeft:"2vw"}}><a href='/'>Jaxon Poentis</a></span>
            <a style={{textDecoration: "underline",}} target={"_blank"} href='https://www.rooseveltstem.com/'>Coding Club</a>
            <a style={{textDecoration: "underline"}}  href='/projects'>Project Catalog</a>

            <a style={{textDecoration: "underline",}}  href='/'>Home</a>

          </div>
        </div>
  )
}

export default Header
