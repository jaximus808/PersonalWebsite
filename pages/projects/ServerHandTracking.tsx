import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../../styles/Home.module.css'

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
        <div className={styles.maincotainer}>
          <h1 style={{"fontSize":"300%"}}>～Server Hand-Tracking Robotic Hand～</h1>
         
            <div>
              <iframe width="560" height="315" src="https://www.youtube.com/embed/ixc6L8SsFSI" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>  
              <h3>
                This project was for the Regeneron International Science and Engineering Fair and was a solution to physically connecting people together with a more functional appraoch. It uses hand tracking to allow uses to control the robotic prototype through using UDP. 
                <p></p>Source Code:
                <ul>
                  <li>
                    <a style={{textDecoration: "underline"}}  href='https://github.com/jaximus808/MasterArduinoServer'>Master Server</a>
                    <p>
                    This part handles the authentication of clients and putting users and robotic clients in the correct Fleet Server.</p>
                    <p></p>
                  </li>  
                  <li>
                    <a style={{textDecoration: "underline"}} href='https://github.com/jaximus808/HandRobotSimulator20212022'>Fleet Server</a>
                    
                    <p>This part handles the authentication of clients and putting users and robotic clients in the correct Fleet Server.</p>
                    <p></p>
                  </li>  
                </ul> 
              </h3>
            </div>
        </div>
    </div>
  )
}

export default Home
