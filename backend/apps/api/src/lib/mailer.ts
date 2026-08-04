import { env } from "@darkline/config";
import { logger } from "./logger";

/**
 * SendGrid's v3 REST API over plain fetch — one JSON POST, so no SDK.
 * Swapping to SES/Postmark means replacing `deliver()` only; the two
 * exported functions are the interface the auth controller depends on.
 *
 * Unconfigured (no API key or from-address) it logs what it would have sent.
 * That is the dev path — signup and password reset stay exercisable without
 * an email provider.
 */
const SENDGRID_API = "https://api.sendgrid.com/v3/mail/send";

function isConfigured(): boolean {
  return Boolean(env.SENDGRID_API_KEY && env.MAIL_FROM);
}

async function deliver(to: string, subject: string, text: string): Promise<void> {
  const res = await fetch(SENDGRID_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: env.MAIL_FROM, name: "Darkline" },
      subject,
      content: [{ type: "text/plain", value: text }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.error({ status: res.status, detail: detail.slice(0, 300), to }, "SendGrid delivery failed");
    throw new Error("Failed to send email");
  }
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  if (!isConfigured()) {
    logger.info({ to, code }, "[mailer:stub] verification email — SendGrid not configured, code logged instead");
    return;
  }
  await deliver(
    to,
    "Verify your Darkline account",
    `Your Darkline verification code is ${code}.\n\nIt expires in 15 minutes. If you didn't create an account, ignore this email.`,
  );
  logger.info({ to }, "Verification email sent");
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  if (!isConfigured()) {
    logger.info({ to, resetToken: token }, "[mailer:stub] password reset email — SendGrid not configured");
    return;
  }
  // APP_BASE_URL rather than a hardcoded host: the link has to point at
  // whichever web deployment the user actually signed up on.
  const link = `${env.APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await deliver(
    to,
    "Reset your Darkline password",
    `Open this link to choose a new password:\n\n${link}\n\nIt expires in 30 minutes. If you didn't request a reset, ignore this email — your password is unchanged.`,
  );
  logger.info({ to }, "Password reset email sent");
}
