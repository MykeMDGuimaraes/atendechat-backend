import { compare } from "bcryptjs";

import User from "../../models/User";
import AppError from "../../errors/AppError";
import {
  createAccessToken,
  createRefreshToken
} from "../../helpers/CreateTokens";
import { SerializeUser } from "../../helpers/SerializeUser";
import Queue from "../../models/Queue";
import Company from "../../models/Company";
import Setting from "../../models/Setting";

interface SerializedUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  queues: Queue[];
  companyId: number;
}

interface Request {
  email: string;
  password: string;
}

interface Response {
  serializedUser: SerializedUser;
  token: string;
  refreshToken: string;
}

/**
 * Constant-cost dummy bcrypt hash used to equalize response time when the
 * user doesn't exist. Without this, the response is noticeably faster on
 * unknown e-mails (because we skip checkPassword), making timing-based
 * enumeration possible.
 *
 * This hash never matches anything; the compare always returns false.
 * Generated once with: bcrypt.hash("__never_matches__", 8).
 */
const DUMMY_BCRYPT_HASH =
  "$2a$08$hHoFb3DHMr.2vK/8h9oVz.0PQ0DBb.KrfWplc8tKJX8LJ4LNkbN8e";

const AuthUserService = async ({
  email,
  password
}: Request): Promise<Response> => {
  const user = await User.findOne({
    where: { email },
    include: ["queues", { model: Company, include: [{ model: Setting }] }]
  });

  if (!user) {
    // Burn the same time we'd burn on a real password check so that
    // timing-based enumeration ("did the e-mail exist?") fails too.
    await compare(password, DUMMY_BCRYPT_HASH);
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  if (!(await user.checkPassword(password))) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  const token = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  const serializedUser = await SerializeUser(user);

  return {
    serializedUser,
    token,
    refreshToken
  };
};

export default AuthUserService;
