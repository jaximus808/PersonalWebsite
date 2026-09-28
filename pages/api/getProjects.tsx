import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ?summary=1 returns only what a navigation list needs.
  const summary = Boolean(req.query.summary);

  try {
    const projects = await prisma.projects.findMany({
      orderBy: {
        projectDate: "desc",
      },
      ...(summary
        ? { select: { id: true, name: true, projectDate: true } }
        : {}),
    });

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=600"
    );
    return res.json({ fail: false, projects });
  } catch (e: Error | any) {
    console.log(e?.message);
    return res.json({ fail: true, projects: [] });
  }
}
