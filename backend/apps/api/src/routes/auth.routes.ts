import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import { authRateLimiter } from "../middleware/rateLimiters";
import * as auth from "../controllers/auth.controller";
import {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  phoneSendOtpSchema,
  phoneVerifyOtpSchema,
  googleAuthSchema,
  refreshTokenSchema,
  logoutSchema,
} from "../validation/auth.validation";

export const authRouter: Router = Router();

authRouter.post("/signup", validateBody(signupSchema), asyncHandler(auth.signup));
authRouter.post("/verify-email", validateBody(verifyEmailSchema), asyncHandler(auth.verifyEmail));
authRouter.post("/login", authRateLimiter, validateBody(loginSchema), asyncHandler(auth.login));
authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(auth.forgotPassword),
);
authRouter.post("/reset-password", validateBody(resetPasswordSchema), asyncHandler(auth.resetPassword));
authRouter.post(
  "/phone/send-otp",
  authRateLimiter,
  validateBody(phoneSendOtpSchema),
  asyncHandler(auth.phoneSendOtp),
);
authRouter.post(
  "/phone/verify-otp",
  authRateLimiter,
  validateBody(phoneVerifyOtpSchema),
  asyncHandler(auth.phoneVerifyOtp),
);
authRouter.post("/google", validateBody(googleAuthSchema), asyncHandler(auth.googleAuth));
authRouter.post("/refresh-token", validateBody(refreshTokenSchema), asyncHandler(auth.refreshToken));
authRouter.post("/logout", validateBody(logoutSchema), asyncHandler(auth.logout));
authRouter.get("/me", requireAuth, asyncHandler(auth.me));
