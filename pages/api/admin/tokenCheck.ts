import type { NextApiRequest, NextApiResponse } from 'next'

import {PrismaClient, Prisma} from "@prisma/client"
import { getCookies, getCookie, setCookie, deleteCookie } from 'cookies-next';

import * as bcrypt from "bcryptjs";
import * as jsonwebtoken from "jsonwebtoken";

const prisma = new PrismaClient(); 

export default async (req: NextApiRequest, res: NextApiResponse) =>
{
    try
    {
        if(req.method != "POST")
        {
            return res.status(400).json({message: "HM?"});
        }

    }
    catch
    {
        res.json({authenticated: false, msg: "Somewthing went wrong"});
    }


    
}
