import type { NextApiRequest, NextApiResponse } from 'next'

import {PrismaClient, Prisma} from "@prisma/client"
import { getCookies, getCookie } from 'cookies-next';

import * as bcrypt from "bcrypt";
import * as jsonwebtoken from "jsonwebtoken";


export default async function handler(req: NextApiRequest, res: NextApiResponse)
{
    const prisma = new PrismaClient();
    let projects:any;
    try  
    {
        projects = await prisma.projects.findMany(
            {
                orderBy: {
                    projectDate: 'desc'
                }
            }
        )
    }
    catch
    {
        projects = []; 
    }

    try
    {
        return res.json({fail:false, 
            projects: JSON.parse(JSON.stringify(projects))})
    }
    catch
    {
        res.json({fail:true, projects:[]});
    }


    
    
}
