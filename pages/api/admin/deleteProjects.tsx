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
    console.log(blogDetails)
    try{
        const savedDetails = await prisma.projects.delete({
            where: {
                name: blogDetails.post_name
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
