import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { isBaileysProvider, StartWhatsAppSession } from "./StartWhatsAppSession";
import * as Sentry from "@sentry/node";

export const StartAllWhatsAppsSessions = async (
  companyId: number
): Promise<void> => {
  try {
    const whatsapps = await ListWhatsAppsService({ companyId });
    if (whatsapps.length > 0) {
      whatsapps
        .filter(whatsapp => isBaileysProvider(whatsapp.provider))
        .forEach(whatsapp => {
          StartWhatsAppSession(whatsapp, companyId);
        });
    }
  } catch (e) {
    Sentry.captureException(e);
  }
};
