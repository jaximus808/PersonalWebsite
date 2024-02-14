import Head from 'next/head'
import style from '../../styles/valentines.module.css'
import { useState,useRef } from 'react'
import Image from 'next/image'
import ConfettiExplosion from 'react-confetti-explosion';
const Brisa = () => {

    const surePhrases = [
        "I think u misclicked",
        "pwease :3",
        "ur so funny :)",
        "the yes button is to the left silly!",
        "ur paying for dinner if u keep saying no",
        "I'm gonna cry",
        "PLEASEEEEEEEE",
        "🥺",
        "You've GYAT to say yes :3",
        "I'm gonna take ur therapist and blame u",
        "¡POR FAVOR!",
        "Daddy doesn't appreciate this",
        "meow :(",
        "IM GONNA BE VERY SAD",
        "THATS IT YOU BETTER SAY YES OR ELSE",
        "hehe :)",
    ]

    const celebrate = ()=>
    {
        sheSaidYes(true);
    }

    const yesCheck = (event:any) =>
    {
        if(yesBut === "")
        {
            celebrate();
            yesButSet('✔️')

            noButSet('')
        }
        else 
        {
            yesButSet('')
        }
    }

    const noCheck = (event:any) =>
    {
        if(reachedEnd)
        {
            if(noBut === "")
            {
                noButSet('✔️')
                yesButSet('')
                celebrate();
            }
            else 
            {
                noButSet('');
            }
            return;
        } 
        if(noCount < surePhrases.length)
        {
            setSure(surePhrases[noCount])
            setNoCount(noCount+1);
        }
        if(noCount+1 == surePhrases.length)
        {
            setNoMessage("yes :)")
            setNoCount(0)
            setReachedEnd(true)
        }
       
        // if(noBut === "")
        // {
        //     noButSet('✔️')
        //     yesButSet('')
        // }
        // else 
        // {
        //     noButSet('')
        // }
    }

    const [sure, setSure ] = useState("")
    const [yesBut, yesButSet] = useState("");
    const [noBut, noButSet] = useState("");
    const [noCount, setNoCount] = useState(0);
    const [reachedEnd, setReachedEnd] = useState(false);
    const [noMessage, setNoMessage] = useState('No :(');

    const [saidYes, sheSaidYes] = useState(false);
    

    return(
        <div >
            <style jsx global >{`
                        html,
                        body {
                            padding: 0;
                            margin: 0;
                            
                              background-repeat: no-repeat;
                              background-attachment: fixed;
                              background-color: #fd9ed0;
                              overflow-x: hidden;
                              overflow-y: hidden;
                              
                        }
                       

                        
            `}</style>
            <Head>
                <title>Jaxon Poentis</title>
                <meta name="description" content="Personal Page For Jaxon Poentis" />
                <link rel="icon" href="/favicon.ico" />
                
            </Head>
            <>{saidYes && <ConfettiExplosion force={1} width={window.innerWidth*2} particleCount={200}/>}</>
            <div>

                <div className={style.valenContainer}>
                    <div className={`${style.valenEl} ${(saidYes)?"hidden":""}`}>
                        <h1 className="text-[8vw]">Brisa,</h1>
                        <h1 className="text-[5vw]">Will You Be My Valentines?</h1>
                        <div className='w-[100%] mt-4 grid grid-cols-2'>
                            <div className=' mt-4 inline '>
                                <button onClick={yesCheck} style={{width:`calc(2rem + ${0.5*(noCount)}rem)`,height:`calc(2rem + ${0.5*(noCount)}rem)`}} className={`text-[80%]   border-4 border-black` }id="yesCheck">{yesBut}</button>
                                <div>{'Yes :)'}</div>
                                </div>
                            <div className=' mt-4'>
                                <button onClick={noCheck} className='text-[80%] w-8 h-8 border-4 border-black' id="noCheck">
                                    <div>

                                        {noBut}
                                    </div>
                                    
                                </button>
                                <div>{noMessage}</div>
                                <div className='bg-[#ffeef7]'>{sure}</div>
                            </div>
                            
                        </div>
                        
                    </div>
                    <div className={`${style.celEl} ${(saidYes)?"":"hidden"}`} id="celebrate" >
                            <h3 className='text-5xl'>{"YAY :)"}</h3>
                            <h3 className='text-3xl'>Happy Valentines Brisa!!!</h3>
                            <div className='mt-5 grid gap-5 grid-cols-3'>
                                <img alt='front picture' src="/Swag.JPG"  className='relative left-[50%] translate-x-[-50%]' style={{"borderRadius":"0.5rem"}}/>

                                <img alt='front picture' src="/LOL.JPG" className='relative left-[50%] translate-x-[-50%]' style={{"borderRadius":"0.5rem"}}/>

                                <img alt='front picture' src="/gangswag.jpg" className='relative left-[50%] translate-x-[-50%]' style={{"borderRadius":"0.5rem"}}/>
                                
                                <img alt='front picture' src="/inflrated.JPG" className='relative left-[50%] translate-x-[-50%]' style={{"borderRadius":"0.5rem"}}/>

                                <img alt='front picture' src="/ohHellnaw.JPG"  className='relative left-[50%] translate-x-[-50%]' style={{"borderRadius":"0.5rem"}}/>

                                <img alt='front picture' src="/mexicancat.PNG" className='relative left-[50%] translate-x-[-50%]' style={{"borderRadius":"0.5rem"}}/>

                            </div>
                            
                            
                        </div>
                </div>
            </div>
        </div>
    )

}


export default Brisa;