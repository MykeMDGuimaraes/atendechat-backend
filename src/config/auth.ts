import { randomBytes } from "crypto";

const isProduction = (process.env.NODE_ENV || "").toLowerCase() === "production";

const requireSecret = (envName: string): string => {
  const value = process.env[envName];

  if (value && value.trim().length >= 16) {
    return value;
  }

  if (isProduction) {
    // eslint-disable-next-line no-console
    console.error(
      `[auth-config] FATAL: ${envName} is missing or too short (must be >= 16 chars). ` +
        `Refusing to start with insecure default in production.`
    );
    process.exit(1);
  }

  // Dev-only fallback: gera segredo random POR BOOT.
  // Tokens emitidos não sobrevivem a restart, o que é o comportamento
  // desejado em desenvolvimento (e sinaliza claramente que o env não foi setado).
  const generated = randomBytes(48).toString("base64");
  // eslint-disable-next-line no-console
  console.warn(
    `[auth-config] ${envName} not set. Using random per-boot secret for development. ` +
      `Tokens will not survive restart. Set ${envName} in your .env to persist sessions.`
  );
  return generated;
};

export default {
  secret: requireSecret("JWT_SECRET"),
  expiresIn: "15m",
  refreshSecret: requireSecret("JWT_REFRESH_SECRET"),
  refreshExpiresIn: "7d"
};
