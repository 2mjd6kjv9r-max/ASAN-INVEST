import { UserRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!req.user.roles.some((role) => roles.includes(role))) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}

export function authorizeInvestorOrStaff(staff: UserRole[]) {
  return authorize(UserRole.INVESTOR, ...staff);
}
