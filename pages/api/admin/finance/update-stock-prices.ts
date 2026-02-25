// ============================================================
// GET /api/admin/finance/update-stock-prices
//   Cron-friendly endpoint that fetches live prices for every
//   ticker in finance_portfolio_stocks and updates the table.
//
//   Auth: Bearer token via Authorization header.
//   Set CRON_SECRET in your environment variables.
//
//   Example:
//     curl -H "Authorization: Bearer <CRON_SECRET>" \
//       https://yoursite.com/api/admin/finance/update-stock-prices
// ============================================================
import type { NextApiRequest, NextApiResponse } from "next";
import { updateAllStockPrices } from "../../../../lib/updateStockPrices";

/**
 * Validate the request carries a valid Bearer token that matches
 * the CRON_SECRET environment variable.
 */
function isAuthedCron(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7).trim();
  return token === process.env.CRON_SECRET;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ── Auth ────────────────────────────────────────────
  if (!isAuthedCron(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await updateAllStockPrices();

    return res.json({
      ok: true,
      ...result,
      message: `Updated ${result.updated.length}/${result.total} stocks`,
    });
  } catch (err: any) {
    console.error("[update-stock-prices]", err);
    return res.status(500).json({ error: err.message ?? "Internal error" });
  }
}
