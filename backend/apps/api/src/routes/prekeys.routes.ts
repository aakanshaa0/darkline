import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import * as prekeys from "../controllers/prekeys.controller";
import { uploadPrekeysSchema } from "../validation/prekeys.validation";

export const prekeysRouter: Router = Router();
prekeysRouter.use(requireAuth);

prekeysRouter.post("/", validateBody(uploadPrekeysSchema), asyncHandler(prekeys.uploadPrekeys));
prekeysRouter.get("/:userId", asyncHandler(prekeys.getPrekeyBundle));
