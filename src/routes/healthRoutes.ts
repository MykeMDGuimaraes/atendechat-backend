import { Router, Request, Response } from "express";
import sequelize from "../database";

// Backend version comes from package.json. We import it lazily so that
// failures here never break the server boot.
let pkgVersion = "unknown";
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  pkgVersion = require("../../package.json").version || "unknown";
} catch (_) {
  /* ignore */
}

const healthRoutes = Router();

/**
 * GET /health — cheap liveness probe.
 *
 * Use this for load balancer / Traefik / EasyPanel liveness checks.
 * Does NOT touch the database. Returns 200 as long as the Express process
 * is up and routing requests.
 */
healthRoutes.get("/health", (_req: Request, res: Response) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    service: "atendechat-backend",
    version: pkgVersion,
    env: process.env.NODE_ENV || "unknown",
    uptime_s: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/db — readiness probe with database round-trip.
 *
 * Validates that the Postgres connection is reachable and accepting
 * queries. Use this for monitoring that should distinguish "process up"
 * from "process up AND DB up".
 *
 * Cost: one trivial `SELECT 1`. Cheap, but NOT free — don't poll faster
 * than every few seconds.
 *
 * Returns:
 *   200 { ok: true, db: "up", latency_ms: <n> }
 *   503 { ok: false, db: "down", error: "<sanitized message>", latency_ms: <n> }
 */
healthRoutes.get("/health/db", async (_req: Request, res: Response) => {
  res.set("Cache-Control", "no-store");
  const startedAt = Date.now();

  try {
    await sequelize.query("SELECT 1");
    const latencyMs = Date.now() - startedAt;
    return res.status(200).json({
      ok: true,
      db: "up",
      latency_ms: latencyMs,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startedAt;
    // Sanitize: never leak credentials/host. Keep just the error name +
    // a short message snippet — enough to diagnose, safe to expose.
    const errName = err?.name || "Error";
    const errMsg = (err?.message || String(err)).toString().slice(0, 200);
    return res.status(503).json({
      ok: false,
      db: "down",
      error: `${errName}: ${errMsg}`,
      latency_ms: latencyMs,
      timestamp: new Date().toISOString()
    });
  }
});

export default healthRoutes;
