import type { NextApiRequest, NextApiResponse } from 'next'

import { getCookies, getCookie, setCookie, deleteCookie } from 'cookies-next';

import * as bcrypt from "bcryptjs";
import * as jsonwebtoken from "jsonwebtoken";


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
