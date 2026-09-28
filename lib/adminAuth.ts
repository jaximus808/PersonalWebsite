import type { NextApiRequest } from "next";
import * as jsonwebtoken from "jsonwebtoken";

/**
 * True when the request carries a valid admin `token` cookie (set by
 * /api/admin/login). Any failure (missing cookie, missing secret, bad
 * signature) is treated as unauthenticated.
 */
export function isAdminRequest(req: NextApiRequest): boolean {
  const token = req.cookies?.token;
  const secret = process.env.ADMIN_PASS;
  if (!token || !secret) return false;

  try {
    jsonwebtoken.verify(token, secret);
    return true;
  } catch {
    return false;
  }
}
