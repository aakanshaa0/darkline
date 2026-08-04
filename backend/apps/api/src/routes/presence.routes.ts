import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/requireAuth";
import * as presence from "../controllers/presence.controller";

export const presenceRouter: Router = Router();
presenceRouter.use(requireAuth);

presenceRouter.get("/:userId", asyncHandler(presence.getPresence));
