import type { NextApiRequest, NextApiResponse } from 'next'

import {PrismaClient, Prisma} from "@prisma/client"
import { getCookies, getCookie, setCookies, removeCookies } from 'cookies-next';

import * as bcrypt from "bcrypt";
import * as jsonwebtoken from "jsonwebtoken";

const prisma = new PrismaClient(); 

export default async (req: NextApiRequest, res: NextApiResponse) =>
{
    const prisma = new PrismaClient();
    let blogs:any;
    try  
    {
        blogs = await prisma.blog.findMany()
    }
    catch
    {
        blogs = []; 
    }

    try
    {
        return res.json({fail:false, 
            blogs: JSON.parse(JSON.stringify(blogs))})
    }
    catch
    {
        res.json({fail:true, blogs:[]});
    }


    
    
}
