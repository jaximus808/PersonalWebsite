import React from "react";
import Background from "./backgroundThree";
import GradientBG from "./gradientbg";
import styles from '../styles/Home.module.css'

const UnderConstruction: React.FC<{title: string}> = (props : {title: string}) => {
    return (
      <>
        <Background />
        <GradientBG />
        <div className={styles.mainTitleName}>
        <div className={styles.centerRel}>
          <div className='text-center md:text-[6vw] text-[80px] px-2 font-thin'  >{props.title} is Under Construction</div>
        </div>
      </div>
    </>
    )
};

export default UnderConstruction;
