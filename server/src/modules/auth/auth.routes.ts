import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authRateLimiter } from "../../middleware/rate-limit";
import { validate } from "../../middleware/validate";
import { authController } from "./auth.controller";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  twoFactorSchema,
  verifyEmailSchema,
} from "./auth.schemas";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validate(registerSchema), authController.register);
authRouter.post("/login", authRateLimiter, validate(loginSchema), authController.login);
authRouter.post("/2fa/verify", authRateLimiter, validate(twoFactorSchema), authController.verifyTwoFactor);
authRouter.post("/refresh", authRateLimiter, authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", authenticate, authController.me);
authRouter.post("/forgot-password", authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
authRouter.post("/reset-password", authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);
authRouter.post("/verify-email", authRateLimiter, validate(verifyEmailSchema), authController.verifyEmail);
authRouter.post("/asan-login", authRateLimiter, authController.asanLogin);
