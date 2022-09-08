
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Header from '../components/header'


export default function Index( { }) {

  return (
    <div>
      <Head>
        <title>Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
        <Header/>
       
        <div className={styles.maincotainer}>
            <p></p>
            <h1 style={{fontSize:"300%"}}>～Hosted Projects～</h1>
            <ul>
                <li>
                    <div>
                        <h2><a style={{textDecoration: "underline"}} href={"/projects/emailbriefer"}>
                            Email Morning Briefer</a>
                        </h2>
                        <div style={{paddingLeft:"20px"}}>
                            <img src='tsant.png' width="370" height="315" />
                            <h3>
                            This service allows a user to plan out one's day.
                            <p></p>
                            </h3>
                        </div>
                    </div>
                </li>
            </ul>
            <div style={{marginTop:"50px"}}>
              <h5>Made by Jaxon Poentis</h5>
            </div>
        </div>
    </div>
  )
}

