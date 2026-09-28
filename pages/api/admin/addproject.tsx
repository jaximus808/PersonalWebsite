import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "../../../lib/prisma";
import { isAdminRequest } from "../../../lib/adminAuth";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

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

  const body = req.body ?? {};

  if (
    !isNonEmptyString(body.name) ||
    !isNonEmptyString(body.mediaLink) ||
    !isNonEmptyString(body.description) ||
    !isNonEmptyString(body.shortDescription)
  ) {
    return res.json({
      pass: false,
      msg: "name, mediaLink, shortDescription and description are required",
    });
  }

  try {
    await prisma.projects.create({
      data: {
        name: body.name.trim(),
        mediaLink: body.mediaLink.trim(),
        youtube: body.youtube === true,
        description: body.description,
        shortDescription: body.shortDescription,
        linkName: asString(body.linkName),
        // Stored as text; the form omits it to mean "now".
        projectDate: isNonEmptyString(body.projectDate)
          ? body.projectDate
          : new Date().toISOString().slice(0, 16),
        favorite: body.favorite === true,
        projectLinks: asString(body.projectLinks),
      },
    });
    return res.json({ pass: true });
  } catch (e: Error | any) {
    console.log(e);
    const msg =
      e?.code === "P2002"
        ? "A project with the same name already exists"
        : "Failed to save project";
    return res.json({ pass: false, msg });
  }
}
