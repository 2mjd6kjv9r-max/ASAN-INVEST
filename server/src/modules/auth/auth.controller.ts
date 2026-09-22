import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { REFRESH_COOKIE } from "../../lib/tokens";
import * as authService from "./auth.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  authService.setRefreshCookie(res, result.refreshToken);
  res.status(201).json({ data: { user: result.user, accessToken: result.accessToken } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body.email, req.body.password);
  authService.setRefreshCookie(res, result.refreshToken);
  res.json({ data: { user: result.user, accessToken: result.accessToken } });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
  authService.setRefreshCookie(res, result.refreshToken);
  res.json({ data: { user: result.user, accessToken: result.accessToken } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  authService.clearRefreshCookie(res);
  res.status(204).end();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.me(req.user!.id);
  res.json({ data });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  res.json({ data: { ok: true } });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password);
  res.json({ data: { ok: true } });
});
