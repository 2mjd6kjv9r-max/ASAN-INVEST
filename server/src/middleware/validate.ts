import type { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../lib/errors";

type RequestPart = "body" | "query" | "params";

export function validate(schema: ZodSchema, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      next(AppError.badRequest("VALIDATION_ERROR", "Request validation failed", details));
      return;
    }
    req[part] = result.data as never;
    next();
  };
}
