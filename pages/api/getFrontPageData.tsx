import type { NextApiRequest, NextApiResponse } from 'next'

import {PrismaClient, Prisma} from "@prisma/client"
import { getCookies, getCookie} from 'cookies-next';

import * as bcrypt from "bcrypt";
import * as jsonwebtoken from "jsonwebtoken";

const prisma = new PrismaClient(); 

export default async function handler(req: NextApiRequest, res: NextApiResponse)
{
    let failmsg = "";
    const prisma = new PrismaClient();
    let failed = false;
    let  pastFavoriteProjects:any;
    try
    {
        pastFavoriteProjects = await prisma.projects.findMany(
            {
                orderBy: {
                    projectDate: 'desc'
                },
                take: 3
        })
        pastFavoriteProjects.reverse();    
    }
    catch (e: Error | any)
    {
        pastFavoriteProjects = [];
        failed = true;
        failmsg += e.message;
    }
    let  recentBlogs:any;
    try
    {
        recentBlogs = await prisma.blog.findMany({
            orderBy: {
                    datePosted: 'desc'
                },
                take: 1
        })

    
    }
    catch(e: Error | any)
    {
        recentBlogs = []

        failed = true
        failmsg += e.message;
    }

    try
    {
        return res.json({fail:failed, msg: failmsg,  pastProjFav: JSON.parse(JSON.stringify(pastFavoriteProjects)), recentBlogs: JSON.parse(JSON.stringify(recentBlogs))})
    }
    catch(e: Error | any)
    {
        res.json({fail:true, pastProjFav:[], recentBlogs:[]});
    }   
}
