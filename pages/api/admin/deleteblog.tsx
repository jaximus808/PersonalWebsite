import type { NextApiRequest, NextApiResponse } from 'next'

import {PrismaClient, Prisma} from "@prisma/client"

const prisma = new PrismaClient(); 

export default async (req: NextApiRequest, res: NextApiResponse) =>
{
    if(req.method != "POST")
    {
        return res.status(400).json({pass: false,message: "HM?"});
    }

    const blogDetails = req.body;
    try{
        const savedDetails = await prisma.blog.delete({
            where: {
                id:blogDetails.blogid
            }
        });
        res.json({
            pass:true
        });
    }
    catch(e)
    {
        console.log(e)
        res.json({
            pass:false
        });
    }
    
    
}
