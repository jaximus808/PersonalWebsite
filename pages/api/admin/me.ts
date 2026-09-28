import type { NextApiRequest, NextApiResponse } from "next";

import { isAdminRequest } from "../../../lib/adminAuth";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ authenticated: false });
  }

  return res.status(200).json({ authenticated: isAdminRequest(req) });
}
