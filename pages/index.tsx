import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Jaxon Poentis</title>
        <meta name="description" content="Personal Page For Jaxon Poentis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
        <div className={styles.maincotainer}>
          <h1 style={{"fontSize":"300%"}}>～Jaxon Poentis～</h1>
          <h3>Hello! My name is Jaxon Poentis and I am currently a senior at Roosevelt High School in Hawaii. I am self-taught programmer and I create projects in Website-Devolpment, Machine Learning, Networking, Game Devolpment, and whatever interests me at the time. I am very interested in learning more about Computer Science and Quantum Computing in the future.</h3>
          
        <h1>～My Socials～</h1>
          <h3>

            <ul style={{fontSize:"130%",textDecoration: "underline"}}>
              <li style={{marginBottom: "20px"}}>
                <a href='https://github.com/jaximus808'>Github</a>
              </li>
              <li style={{marginBottom: "20px"}} >
                <a href='https://instagram.com/jaxonsoldev?igshid=YmMyMTA2M2Y='>Developer Log Instagram</a>
               
              </li>
              <li style={{marginBottom: "20px"}} >
                <a href='jaximus808@gmail.com'>Email: jaximus808@gmail.com</a>
               
              </li>
              <li style={{marginBottom: "20px"}} >
                <a href='https://www.linkedin.com/in/jaxon-poentis-967357243/'>Linkedin</a>
               
              </li>
              <li style={{marginBottom: "20px"}}>
                <a href='https://www.youtube.com/channel/UCqakvmaEw3OYRjkpY1gXKag'>Developer Log Youtube</a>
              </li>
            </ul>
          </h3>
        
        <h1>～Get To Know Me～</h1>
        <h3>
          I was born on March 23rd 2005 and I grew up on the island of Oahu. My ethnicities are (in order from highest percentage): Japanese, Hawaiian, Filipino, Spanish, and Korean. I began block-based coding with scratch in elementary school and serious text-based coding at the end of freshman year of High School.
          <p></p>
          Some other activities I participate in are Boy Scouts (currently a Life Scout), Tennis, Math Team, and the founder of the Roosevelt Coding Club. 
          <p></p>
          Some things I like to eat are Ramen, Steak, and Mango dessert. I enjoy hanging out with friends whenever I have the time and I love nerding out with other students interested in STEM, however biology usually goes over my head haha. 
        </h3>
          <h1>～Current Projects～</h1>
          <h3>
            Use github api later 
          </h3>
          <h1>～Past Favorite Projects～</h1>

            <div>
              <h2 style={{ fontStyle: "italic","fontSize":"180%"}}>Server Hand-Tracking Robotic Hand</h2>
              <div style={{paddingLeft:"20px"}}>
                <iframe width="560" height="315" src="https://www.youtube.com/embed/ixc6L8SsFSI" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>  
                <h3>
                  This project was for the Regeneron International Science and Engineering Fair and was a solution to physically connecting people together with a more functional appraoch. It uses hand tracking to allow uses to control the robotic prototype through using UDP. 
                  <p></p>
                  <a style={{textDecoration: "underline"}} href='/projects/ServerHandTracking'>Learn More...</a>
                </h3>
              </div>
            </div>
            <div>
              <h2 style={{fontStyle: "italic","fontSize":"180%"}}>Coding Club Website</h2>
              <div style={{paddingLeft:"20px"}}>
                <img src='codingClubLogo.png'width="315" height="315"></img>
                <h3>
                  This website is for the Coding Club at Roosevelt High School. The website can be found at <a style={{textDecoration: "underline"}} target='_blank' href='https://www.rooseveltstem.com'>rooseveltstem.com.</a> It allows annoucements to be posted through a discord bot that adds events to a mongodb database.
                  <p></p>
                  <a style={{textDecoration: "underline"}} href='/projects/CodingClubWeb'>Learn More...</a>
                </h3>
              </div>
            </div>
            <div>
              <h2 style={{fontStyle: "italic","fontSize":"180%"}}>Multiplayer AP Pyschology Game 1.0</h2>
              <div style={{paddingLeft:"20px"}}>
                <img src='socketgame.gif'width="560" height="315"></img>
                <h3>
                  This multiplayer game was created for an Ap Pysychology class for students to play as a game to help memorize important terms on the module. There were some issues but this helped me to understand and actually work with socket streaming and multiplayer games. In the future I plan to improve this to allow users to customize the game with their own terms along with better multiplayer architecture. 
                  <p></p>
                  <a style={{textDecoration: "underline"}} href='/projects/PyschologyGame1.0'>Learn More...</a>
                </h3>
              </div>
            </div>
            <div style={{marginTop:"50px"}}>
              <h5>Made by Jaxon Poentis 🤙</h5>
            </div>
        </div>
    </div>
  )
}

export default Home
