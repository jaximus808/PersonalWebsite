import { request } from 'https'
import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import { useState } from 'react'
import styles from '../styles/Home.module.css'

import { getCookies, getCookie, setCookies, removeCookies } from 'cookies-next';


interface Props {

  authenticated: boolean;
  authSense: boolean


}



const Footer: NextPage<Props> = (props) => {

  const [userN, setUserN] = useState("");
  const [pass, setPass] = useState("");
  const [responseText, setResponse] = useState("");


  const LogOut = () => {
    removeCookies("token");
    location.reload();
  }


  const handleChangeN = (e: any) => {
    setUserN(e.target.value)
  }

  const handleChangeP = (e: any) => {
    setPass(e.target.value)
  }

  const Login = async (event: any) => {
    event.preventDefault();
    console.log(userN);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers:
      {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        {
          username: userN,
          pass: pass
        })
    })
    const data = await response.json();
    if (data.authenticated) {
      setAuthEn(true);

      location.reload();
    }
    else {
      setResponse(data.msg);
    }
  }

  const { authenticated, authSense } = props;

  const [authen, setAuthEn] = useState(authenticated);
  return (


    <div className={styles.realfooterContianer}>
      {(authSense) ? (authen) ?
        <div style={{ marginTop: "50px" }}>
          <h5>Admin View</h5>
          <button onClick={LogOut}>Log Out</button>
        </div> :
        <div>
          <h5>Admin Login</h5>
          <form onSubmit={Login}>
            <label>
              {"Username: "}
            </label>
            <input type={"text"} value={userN} onChange={handleChangeN} />
            <p></p>
            <label>
              {"Password: "}
            </label>
            <input type={"password"} value={pass} onChange={handleChangeP} />
            <p></p>
            <label>
              {responseText}
            </label><p></p>
            <p> </p>
            <input type={"submit"} value={"Login"} />
          </form>
        </div>
        :
        <>

        </>}
      <div className={styles.footerContainer} style={{ width: "100%" }}>

        <h5 style={{}}>Website Made by Jaxon Poentis</h5>

        <h5 className='font-thin' style={{}}>Website developed with Next.js and Typescript + MongoDB database. Background is made with Three.js. This webpage is still being updated, come back soon for updates!</h5>
        <p></p>
      </div>
    </div>
  )
}

export default Footer
