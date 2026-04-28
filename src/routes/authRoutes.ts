import { Router } from "express";
import * as SessionController from "../controllers/SessionController";
import * as UserController from "../controllers/UserController";
import isAuth from "../middleware/isAuth";
import envTokenAuth from "../middleware/envTokenAuth";
import {
  authStrictLimiter,
  authSoftLimiter
} from "../middleware/rateLimiters";

const authRoutes = Router();

// Brute-forceable endpoints: strict limiter (5 / 15min per IP in prod).
authRoutes.post("/signup", authStrictLimiter, envTokenAuth, UserController.store);
authRoutes.post("/login", authStrictLimiter, SessionController.store);

// Refresh: soft limiter (60 / min per IP in prod). Active sessions
// legitimately call this on focus, on retries, on token expiry.
authRoutes.post("/refresh_token", authSoftLimiter, SessionController.update);

// Authenticated endpoints don't need IP-based rate-limit (the auth middleware
// already provides per-user gating).
authRoutes.delete("/logout", isAuth, SessionController.remove);
authRoutes.get("/me", isAuth, SessionController.me);

export default authRoutes;
