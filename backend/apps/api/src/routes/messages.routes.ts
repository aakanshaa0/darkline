import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import * as messages from "../controllers/messages.controller";
import { syncMessagesSchema, editMessageSchema } from "../validation/messages.validation";

export const messagesRouter: Router = Router();
messagesRouter.use(requireAuth);

messagesRouter.post("/sync", validateBody(syncMessagesSchema), asyncHandler(messages.syncMessages));
messagesRouter.patch("/:id", validateBody(editMessageSchema), asyncHandler(messages.editMessage));
