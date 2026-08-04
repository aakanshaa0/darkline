import { logger } from "./logger";

/**
 * No email provider is wired up yet (the architecture doc doesn't specify
 * one — SES/SendGrid/etc. would be a real integration, not something to
 * fabricate here). This logs what would have been sent so the flows are
 * exercisable end-to-end in dev; swap the body for a real provider call
 * when one is chosen.
 */
export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  logger.info({ to, code }, "[mailer:stub] verification email");
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  logger.info({ to, resetToken: token }, "[mailer:stub] password reset email");
}
