import type { NextApiRequest, NextApiResponse } from 'next'

import {PrismaClient, Prisma} from "@prisma/client"

const prisma = new PrismaClient(); 

export default async (req: NextApiRequest, res: NextApiResponse) =>
{
    if(req.method != "POST")
    {
        return res.status(400).json({pass: false,message: "HM?"});
    }

    const projectDetails = req.body;
    console.log(projectDetails)
    try{
        const savedDetails = await prisma.projects.delete({
            where: {
                name: projectDetails.post_name
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
