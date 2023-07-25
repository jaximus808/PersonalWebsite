import type { NextApiRequest, NextApiResponse } from 'next'

import {PrismaClient, Prisma} from "@prisma/client"
import { getCookies, getCookie, setCookies, removeCookies } from 'cookies-next';

import * as bcrypt from "bcrypt";
import * as jsonwebtoken from "jsonwebtoken";

const prisma = new PrismaClient(); 

export default async (req: NextApiRequest, res: NextApiResponse) =>
{
    const prisma = new PrismaClient();
    let  pastFavoriteProjects:any;
    try
    {
        pastFavoriteProjects = await prisma.projects.findMany({
        where:
        {
            favorite:true
        }
        })
    
    }
    catch
    {
        pastFavoriteProjects = [];
    }
    let  recentBlogs:any;
    try
    {
        recentBlogs = await prisma.blog.findMany()

        if(recentBlogs.length > 4)
        {

        recentBlogs.splice(0, recentBlogs.length - 4)
        }
        recentBlogs.reverse();

    
    }
    catch
    {
        recentBlogs = []
    }

    try
    {
        return res.json({fail:false, pastProjFav: JSON.parse(JSON.stringify(pastFavoriteProjects)), recentBlogs: JSON.parse(JSON.stringify(recentBlogs))})
    }
    catch
    {
        res.json({fail:true, pastProjFav:[], recentBlogs:[]});
    }


    
    
}
