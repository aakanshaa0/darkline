import { logger } from "./logger";

/**
 * No SMS provider is wired up yet (Twilio/SNS/etc. — same reasoning as
 * lib/mailer.ts). Logs the code so the phone-auth flow is exercisable in
 * dev without a real carrier integration.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  logger.info({ phone, code }, "[sms:stub] OTP SMS");
}
