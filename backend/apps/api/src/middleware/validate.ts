import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";

/** Parses+replaces req.body with the validated result; zod failures are caught by asyncHandler → errorHandler. */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

/** Same as validateBody but for req.query (e.g. pagination params). */
export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.query = schema.parse(req.query);
    next();
  };
}
