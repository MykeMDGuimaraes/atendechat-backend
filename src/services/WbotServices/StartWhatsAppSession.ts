import { initWASocket } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import { wbotMessageListener } from "./wbotMessageListener";
import { getIO } from "../../libs/socket";
import wbotMonitor from "./wbotMonitor";
import { logger } from "../../utils/logger";
import * as Sentry from "@sentry/node";

const BAILEYS_PROVIDERS = ["stable", "beta"];

export const isBaileysProvider = (provider?: string): boolean =>
  BAILEYS_PROVIDERS.includes((provider || "").toLowerCase());

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {
  if (!isBaileysProvider(whatsapp.provider)) {
    logger.info(`Skipping Baileys bootstrap for provider ${whatsapp.provider} on connection ${whatsapp.id}`);
    return;
  }

  await whatsapp.update({ status: "OPENING" });

  const io = getIO();
  io.to(`company-${whatsapp.companyId}-mainchannel`).emit("whatsappSession", {
    action: "update",
    session: whatsapp
  });

  try {
    const wbot = await initWASocket(whatsapp);
    wbotMessageListener(wbot, companyId);
    wbotMonitor(wbot, whatsapp, companyId);
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};
