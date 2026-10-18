import type { NextApiRequest, NextApiResponse } from 'next'

import { getCookies, getCookie, setCookie, deleteCookie } from 'cookies-next';


export default async (req: NextApiRequest, res: NextApiResponse) =>
{
    try
    {
        setCookie("token","meow",{ req, res, maxAge: -1 });res.json({
            msg: "GOOD!"
        })
    }
    catch
    {
        res.json({authenticated: false, msg: "Somewthing went wrong"});
    }


    
}
