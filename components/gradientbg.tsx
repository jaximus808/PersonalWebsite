import css from "../styles/Home.module.css"
import Router from 'next/router'
import * as THREE from "three"
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'

export default function GradientBG() {
  return (
    <div className="fixed top-0 left-0 w-full h-full opacity-40 -z-50">

      <div className={`${css.gradientorb} ${css.orb1}`}></div>
      <div className={`${css.gradientorb} ${css.orb2}`}></div>
      <div className={`${css.gradientorb} ${css.orb3}`}></div>
    </div>
  )
}
