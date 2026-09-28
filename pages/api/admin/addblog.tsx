import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "../../../lib/prisma";
import { isAdminRequest } from "../../../lib/adminAuth";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

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
  const { title, mediaPic, content, datePosted } = body;

  if (
    !isNonEmptyString(title) ||
    !isNonEmptyString(mediaPic) ||
    !isNonEmptyString(content)
  ) {
    return res.json({
      pass: false,
      msg: "title, mediaPic and content are required",
    });
  }

  // The client sends a datetime-local string, or omits it to use "now".
  let parsedDate: Date | undefined;
  if (datePosted !== undefined && datePosted !== null && datePosted !== "") {
    parsedDate = new Date(datePosted);
    if (isNaN(parsedDate.getTime())) {
      return res.json({ pass: false, msg: "Invalid datePosted" });
    }
  }

  try {
    await prisma.blog.create({
      data: {
        title,
        mediaPic,
        content,
        format: "markdown",
        ...(parsedDate ? { datePosted: parsedDate } : {}),
      },
    });
    return res.json({ pass: true });
  } catch (e: Error | any) {
    console.log(e);
    const msg =
      e?.code === "P2002"
        ? "A post with the same title, content or image already exists"
        : "Failed to save blog post";
    return res.json({ pass: false, msg });
  }
}
