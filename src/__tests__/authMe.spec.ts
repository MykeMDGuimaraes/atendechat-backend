import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import { sign } from "jsonwebtoken";
import authConfig from "../config/auth";
import isAuth from "../middleware/isAuth";
import * as SessionController from "../controllers/SessionController";
import AuthUserService from "../services/UserServices/AuthUserService";
import ShowUserService from "../services/UserServices/ShowUserService";

jest.mock("../helpers/SendRefreshToken", () => ({
  SendRefreshToken: jest.fn()
}));
jest.mock("../libs/socket", () => ({
  getIO: () => ({
    to: () => ({
      emit: jest.fn()
    })
  })
}));
jest.mock("../services/UserServices/AuthUserService");
jest.mock("../services/UserServices/ShowUserService");

const mockedAuthUserService = AuthUserService as jest.MockedFunction<
  typeof AuthUserService
>;
const mockedShowUserService = ShowUserService as jest.MockedFunction<
  typeof ShowUserService
>;

describe("GET /auth/me", () => {
  it("returns the authenticated user from access token", async () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.post("/auth/login", SessionController.store);
    app.get("/auth/me", isAuth, SessionController.me);

    const user = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      profile: "admin",
      companyId: 10,
      super: false
    };
    const token = sign(
      { id: user.id, profile: user.profile, companyId: user.companyId },
      authConfig.secret,
      { expiresIn: authConfig.expiresIn }
    );

    mockedAuthUserService.mockResolvedValue({
      token,
      serializedUser: user,
      refreshToken: "refresh-token"
    } as any);
    mockedShowUserService.mockResolvedValue(user as any);

    const loginResponse = await request(app).post("/auth/login").send({
      email: user.email,
      password: "password"
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBe(token);

    const meResponse = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${loginResponse.body.token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toEqual({
      id: user.id,
      profile: user.profile,
      super: user.super
    });
  });
});
