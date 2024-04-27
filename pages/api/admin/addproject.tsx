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
   
// projectName: projectN,
                // projectDesc: projectDesc,
                // ytLink: ytLink,
                // favorite: favorite,
                // mediaLink: mediaLink,
                // githubLink: githubLink,
                // date:date

    try{
        const savedDetails = await prisma.projects.create({
            data: projectDetails
        });
        res.json({
            pass:true
        });
    }
    catch
    {
        console.log("ERROR")
        res.json({
            pass:false
        });
    }
    
    
}
