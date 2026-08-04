import { apiRequest } from "./httpClient";
import { saveTokens, clearTokens } from "./tokenStore";
import type { AuthResult, ApiUser } from "./types";

export async function signup(input: { name: string; username: string; email: string; password: string }) {
  return apiRequest<{ userId: string; email: string }>("/auth/signup", {
    method: "POST",
    body: input,
    skipAuthRetry: true,
  });
}

async function persistAuthResult(result: AuthResult): Promise<AuthResult> {
  await saveTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function verifyEmail(input: { userId: string; code: string }) {
  const result = await apiRequest<AuthResult>("/auth/verify-email", { method: "POST", body: input, skipAuthRetry: true });
  return persistAuthResult(result);
}

export async function login(input: { email: string; password: string }) {
  const result = await apiRequest<AuthResult>("/auth/login", { method: "POST", body: input, skipAuthRetry: true });
  return persistAuthResult(result);
}

export async function forgotPassword(input: { email: string }) {
  return apiRequest<{ message: string }>("/auth/forgot-password", { method: "POST", body: input, skipAuthRetry: true });
}

export async function resetPassword(input: { token: string; newPassword: string }) {
  return apiRequest<{ message: string }>("/auth/reset-password", { method: "POST", body: input, skipAuthRetry: true });
}

export async function phoneSendOtp(input: { phone: string }) {
  return apiRequest<{ message: string }>("/auth/phone/send-otp", { method: "POST", body: input, skipAuthRetry: true });
}

export async function phoneVerifyOtp(input: { phone: string; code: string }) {
  const result = await apiRequest<AuthResult>("/auth/phone/verify-otp", {
    method: "POST",
    body: input,
    skipAuthRetry: true,
  });
  return persistAuthResult(result);
}

export async function googleAuth(input: { idToken: string }) {
  const result = await apiRequest<AuthResult>("/auth/google", { method: "POST", body: input, skipAuthRetry: true });
  return persistAuthResult(result);
}

export async function logout(refreshToken: string) {
  await apiRequest<void>("/auth/logout", { method: "POST", body: { refreshToken }, skipAuthRetry: true });
  await clearTokens();
}

export async function me() {
  return apiRequest<{ user: ApiUser }>("/auth/me");
}
