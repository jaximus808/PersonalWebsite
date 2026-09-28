import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "../../lib/prisma";

const OBJECT_ID = /^[a-f\d]{24}$/i;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ fail: true, blog: null });
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

  if (!id || !OBJECT_ID.test(id)) {
    return res.status(404).json({ fail: true, blog: null });
  }

  try {
    const blog = await prisma.blog.findUnique({ where: { id } });

    if (!blog) {
      return res.status(404).json({ fail: true, blog: null });
    }

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=600"
    );
    return res.status(200).json({ fail: false, blog });
  } catch (e: Error | any) {
    console.log(e?.message);
    return res.status(500).json({ fail: true, blog: null });
  }
}
