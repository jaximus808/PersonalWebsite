import type { NextApiRequest, NextApiResponse } from 'next'

import {PrismaClient, Prisma} from "@prisma/client"

const prisma = new PrismaClient(); 

export default async (req: NextApiRequest, res: NextApiResponse) =>
{
    if(req.method != "POST")
    {
        return res.status(400).json({message: "HM?"});
    }
    const projectDetails = JSON.parse(req.body);

    const savedDetails = await prisma.project.create({
        data:projectDetails
    });
    res.json(savedDetails);
    
}
