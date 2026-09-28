import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ?summary=1 returns only what a navigation list needs, skipping post bodies.
  const summary = Boolean(req.query.summary);

  try {
    const blogs = await prisma.blog.findMany({
      orderBy: {
        datePosted: "desc",
      },
      ...(summary
        ? { select: { id: true, title: true, datePosted: true } }
        : {}),
    });

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=600"
    );
    return res.json({ fail: false, blogs });
  } catch (e: Error | any) {
    console.log(e?.message);
    return res.json({ fail: true, blogs: [] });
  }
}
