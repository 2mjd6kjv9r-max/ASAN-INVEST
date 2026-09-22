import type { CookieOptions, Request, Response } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../lib/async-handler";
import { parseDurationToMs } from "../../lib/tokens";
import { serializeUser } from "../../serializers/user";
import { cookieOptions } from "../../middleware/authenticate";
import { authService } from "./auth.service";

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  const options: CookieOptions = {
    ...cookieOptions,
    expires: expiresAt,
    maxAge: parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN),
  };
  res.cookie(env.REFRESH_COOKIE_NAME, token, options);
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(env.REFRESH_COOKIE_NAME, { ...cookieOptions, maxAge: 0 });
}

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register({ ...req.body, ipAddress: req.ip });
    setRefreshCookie(res, result.refresh.token, result.refresh.expiresAt);
    res.status(201).json({ data: { accessToken: result.accessToken, user: serializeUser(result.user) } });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login({
      email: req.body.email,
      password: req.body.password,
      userAgent: req.get("user-agent") ?? undefined,
      ipAddress: req.ip,
    });
    if (result.twoFactorRequired) {
      res.json({ data: { twoFactorRequired: true, challengeId: result.challengeId } });
      return;
    }
    setRefreshCookie(res, result.refresh.token, result.refresh.expiresAt);
    res.json({ data: { accessToken: result.accessToken, user: serializeUser(result.user) } });
  }),

  verifyTwoFactor: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.verifyTwoFactor(
      req.body.challengeId,
      req.body.code,
      req.get("user-agent") ?? undefined,
    );
    setRefreshCookie(res, result.refresh.token, result.refresh.expiresAt);
    res.json({ data: { accessToken: result.accessToken, user: serializeUser(result.user) } });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refresh(req.cookies?.[env.REFRESH_COOKIE_NAME]);
    setRefreshCookie(res, result.refresh.token, result.refresh.expiresAt);
    res.json({ data: { accessToken: result.accessToken, user: serializeUser(result.user) } });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.cookies?.[env.REFRESH_COOKIE_NAME]);
    clearRefreshCookie(res);
    res.status(204).send();
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.me(req.user!.id);
    res.json({ data: serializeUser(user) });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    res.json({ data: { message: "If an account exists for that email, a reset message was queued." } });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.status(204).send();
  }),

  verifyEmail: asyncHandler(async (req: Request, res: Response) => {
    await authService.verifyEmail(req.body.token);
    res.status(204).send();
  }),

  asanLogin: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ data: authService.asanLogin() });
  }),
};
