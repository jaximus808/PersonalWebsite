import type { NextApiRequest, NextApiResponse } from 'next'

import {PrismaClient, Prisma} from "@prisma/client"
import { getCookies, getCookie, setCookies, removeCookies, deleteCookie } from 'cookies-next';

const prisma = new PrismaClient(); 

export default async (req: NextApiRequest, res: NextApiResponse) =>
{
    try
    {
        setCookies("token","meow",{ req, res, maxAge: -1 });res.json({
            msg: "GOOD!"
        })
    }
    catch
    {
        res.json({authenticated: false, msg: "Somewthing went wrong"});
    }


    
}
