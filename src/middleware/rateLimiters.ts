import rateLimit, { Options } from "express-rate-limit";
import { Request, Response } from "express";

/**
 * Rate-limit factory for auth-sensitive endpoints.
 *
 * Why two presets:
 * - "strict" for credentialed brute-forceable endpoints (login, signup, forgot-password)
 * - "soft" for refresh, which is called legitimately by every active session
 *
 * In test/dev (NODE_ENV !== "production") limits are relaxed so that
 * repeated test runs don't trip rate limits.
 */

const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";

const baseConfig: Partial<Options> = {
  standardHeaders: true, // RateLimit-* headers (RFC draft)
  legacyHeaders: false, // skip X-RateLimit-*
  // Identify clients by the upstream proxy header when present, falling back
  // to the socket address. Traefik forwards X-Forwarded-For; Express needs
  // `app.set("trust proxy", ...)` to honor it. We set that in app.ts (see
  // task 3).
  message: { error: "ERR_RATE_LIMITED" },
  handler: (_req: Request, res: Response, _next, options) => {
    res.status(options.statusCode).json({
      error: "ERR_RATE_LIMITED",
      retryAfterSec: Math.ceil(options.windowMs / 1000)
    });
  }
};

/**
 * Strict: 5 requests per 15 minutes per IP.
 * For: /auth/login, /auth/signup, /auth/forgot-password.
 */
export const authStrictLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5 : 1000
});

/**
 * Soft: 60 requests per minute per IP.
 * For: /auth/refresh_token (called legitimately on app focus, on 403 retry,
 * etc. — needs to allow many legitimate calls).
 */
export const authSoftLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000,
  max: isProd ? 60 : 10000
});
