import { CookieOptions, Response } from "express";

/**
 * Build cookie options for the refresh-token cookie (`jrt`).
 *
 * Frontend (app.*) and backend (api.*) live on different subdomains, which
 * the browser treats as cross-site for XHR/fetch. With the default
 * `SameSite=Lax`, the cookie would never be attached to XHR refresh calls,
 * causing every refresh to 401 — that produced the React #185 render-loop
 * we hit in production.
 *
 * To make the cookie travel cross-site we set:
 *   - sameSite: "none" (required for cross-site requests)
 *   - secure:   true   (required by browsers when SameSite=None)
 *   - domain:   .<root domain> when COOKIE_DOMAIN is provided
 *
 * In local dev (http://localhost) we relax to `sameSite: "lax"` and `secure: false`,
 * because Chrome won't send `Secure` cookies over plain HTTP.
 */
const buildJrtCookieOptions = (): CookieOptions => {
  const isProd =
    (process.env.NODE_ENV || "").toLowerCase() === "production" ||
    /^https:\/\//i.test(process.env.FRONTEND_URL || "");

  const opts: CookieOptions = {
    httpOnly: true,
    path: "/",
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  };

  if (process.env.COOKIE_DOMAIN) {
    opts.domain = process.env.COOKIE_DOMAIN;
  }

  return opts;
};

export const refreshTokenCookieOptions = buildJrtCookieOptions;

export const SendRefreshToken = (res: Response, token: string): void => {
  res.cookie("jrt", token, buildJrtCookieOptions());
};
