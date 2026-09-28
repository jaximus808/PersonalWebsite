import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "../../../lib/prisma";
import { isAdminRequest } from "../../../lib/adminAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method != "POST") {
    return res.status(400).json({ pass: false, msg: "Method not allowed" });
  }

  if (!isAdminRequest(req)) {
    return res.status(401).json({ pass: false, msg: "Unauthorized" });
  }

  const blogid = req.body?.blogid;
  if (typeof blogid !== "string" || blogid.length === 0) {
    return res.json({ pass: false, msg: "blogid is required" });
  }

  try {
    await prisma.blog.delete({
      where: {
        id: blogid,
      },
    });
    return res.json({ pass: true });
  } catch (e) {
    console.log(e);
    return res.json({ pass: false, msg: "Failed to delete blog post" });
  }
}
