import type { NextApiRequest, NextApiResponse } from 'next'

import {PrismaClient, Prisma} from "@prisma/client"
import { getCookie, setCookie } from 'cookies-next';

import * as bcrypt from "bcrypt";
import * as jsonwebtoken from "jsonwebtoken";

const prisma = new PrismaClient(); 

export default async (req: NextApiRequest, res: NextApiResponse) =>
{
    console.log("L");
    try
    {
        if(req.method != "POST")
        {
            return res.status(400).json({message: "HM?"});
        }

        console.log(req.body);
        const attemptDetails = req.body;
        console.log(attemptDetails)
        const username:string = req.body.username;

        const users = await prisma.admin.findUnique({
            where: {
                username: username
            },
        });
        if(!users)
        {
            res.json({
                authenticated: false,
                msg: "Wrong Username or Password"
            });
            return; 
        }
        console.log(users)
        console.log(attemptDetails.username)
        const userPass:string = users?.password!;

        console.log(userPass)
        const result:boolean = await bcrypt.compare(attemptDetails.pass, userPass);
        if(!result)
        {
            console.log("L");
            res.json({
                authenticated: false,
                msg: "Wrong Username or Password"
            });
            return; 
        }

        console.log("L");
        const token = jsonwebtoken.sign({_id:users?.id!},process.env.ADMIN_PASS!);
        setCookie("token", token, { req, res, maxAge: 1000 });
        res.json({
            authenticated: true,
            msg: "GOOD!"
        })
    }
    catch
    {
        res.json({authenticated: false, msg: "Somewthing went wrong"});
    }


    
}
