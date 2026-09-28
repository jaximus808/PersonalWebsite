import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ fail: true, project: null });
  }

  const name = Array.isArray(req.query.name)
    ? req.query.name[0]
    : req.query.name;

  if (!name) {
    return res.status(404).json({ fail: true, project: null });
  }

  try {
    const project = await prisma.projects.findUnique({ where: { name } });

    if (!project) {
      return res.status(404).json({ fail: true, project: null });
    }

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=600"
    );
    return res.status(200).json({ fail: false, project });
  } catch (e: Error | any) {
    console.log(e?.message);
    return res.status(500).json({ fail: true, project: null });
  }
}
