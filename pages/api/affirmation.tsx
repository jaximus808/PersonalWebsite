import type { NextApiRequest, NextApiResponse } from 'next'

import { Resend } from 'resend';

export default async (req: NextApiRequest, res: NextApiResponse) =>
{

    

    var now: any = new Date();
    var start:any = new Date(now.getFullYear(), 0, 0);
    var diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    var oneDay = 1000 * 60 * 60 * 24;
    var day = Math.floor(diff / oneDay)-1;


    const resend = new Resend(process.env.RESEND_KEY);
    
    resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'jaximus808@gmail.com',
      subject: 'Hello World',
      html: '<p>MEWO MEOW <strong>MEOWWWW</strong>!</p>'
    });

    return res.json({message:day})


}
