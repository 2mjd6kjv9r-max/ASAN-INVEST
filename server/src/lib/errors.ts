export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(entity: string): AppError {
  return new AppError(404, "NOT_FOUND", `${entity} not found`);
}

export function unauthorized(message = "Authentication required"): AppError {
  return new AppError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "You do not have permission to do this"): AppError {
  return new AppError(403, "FORBIDDEN", message);
}

export function conflict(code: string, message: string): AppError {
  return new AppError(409, code, message);
}
