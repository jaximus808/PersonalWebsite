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
// projectName: projectN,
                // projectDesc: projectDesc,
                // ytLink: ytLink,
                // favorite: favorite,
                // mediaLink: mediaLink,
                // githubLink: githubLink,
                // date:date

    try{
        console.log(blogDetails)
        // if(blogDetails)
        const savedDetails = await prisma.blog.create({
            data: blogDetails
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
