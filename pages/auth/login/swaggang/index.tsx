import type { NextPage } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import Image from 'next/image'
import { PrismaClient , Prisma} from '@prisma/client'
import { useState,useEffect, useRef,Suspense  } from 'react'
import cookies from "cookie"

import Footer from '../../../components/footer'


import { GetStaticProps, GetStaticPaths, GetServerSideProps } from 'next'
import Youtube from "react-youtube"



// export const getServerSideProps: GetServerSideProps = async (context) =>
// {

//   const prisma = new PrismaClient();
//   let  pastFavoriteProjects:any;
//   try
//   {
//     pastFavoriteProjects = await prisma.projects.findMany({
//       where:
//       {
//         favorite:true
//       }
//     })
  
//   }
//   catch
//   {
//     pastFavoriteProjects = [];
//   }
//   let  recentBlogs:any;
//   try
//   {
//     recentBlogs = await prisma.blog.findMany()

//     if(recentBlogs.length > 4)
//     {

//       recentBlogs.splice(0, recentBlogs.length - 4)
//     }
//     recentBlogs.reverse();

  
//   }
//   catch
//   {
//     recentBlogs = [];
//   }

  

//   return {
//     props:{
//       pastProjFav: JSON.parse(JSON.stringify(pastFavoriteProjects)),
//       recentBlogs: JSON.parse(JSON.stringify(recentBlogs))
//     }
//   }
// }




const Index = () => {
   
  return (
    <div className='text-caviar '>


              <Footer authSense={true} authenticated={false}/>
       

    </div>
  )
}


export default Index