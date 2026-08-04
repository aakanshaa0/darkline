import { env } from "@darkline/config";
import { logger } from "./logger";

/**
 * Twilio over its plain REST API rather than the `twilio` SDK — the send is
 * one form-encoded POST, so the SDK would be a dependency for no gain.
 *
 * Unconfigured (no SID/token/from-number) it logs the code instead of
 * sending. That is the dev path: the phone-auth flow stays exercisable
 * end-to-end without a carrier account, and OTPs are also readable from
 * Redis at `otp:<phone>`.
 */
const TWILIO_API = "https://api.twilio.com/2010-04-01";

function isConfigured(): boolean {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER);
}

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  if (!isConfigured()) {
    logger.info({ phone, code }, "[sms:stub] OTP SMS — Twilio not configured, code logged instead of sent");
    return;
  }

  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const body = new URLSearchParams({
    To: phone,
    From: env.TWILIO_FROM_NUMBER!,
    Body: `Your Darkline verification code is ${code}. It expires in 5 minutes.`,
  });

  const res = await fetch(`${TWILIO_API}/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Deliberately not rethrown with the code in it — this bubbles up to the
    // OTP endpoint, and the response must not leak the code or Twilio's reply.
    logger.error({ status: res.status, detail: detail.slice(0, 300), phone }, "Twilio SMS send failed");
    throw new Error("Failed to send verification SMS");
  }

  logger.info({ phone }, "OTP SMS sent");
}
