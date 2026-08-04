import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import * as conversations from "../controllers/conversations.controller";
import * as messages from "../controllers/messages.controller";
import {
  createConversationSchema,
  updateConversationSchema,
  addMemberSchema,
} from "../validation/conversations.validation";
import { sendMessageSchema, listMessagesQuerySchema } from "../validation/messages.validation";
import { validateQuery } from "../middleware/validate";

export const conversationsRouter: Router = Router();
conversationsRouter.use(requireAuth);

conversationsRouter.get("/", asyncHandler(conversations.listConversations));
conversationsRouter.post("/", validateBody(createConversationSchema), asyncHandler(conversations.createConversation));
conversationsRouter.get("/:id", asyncHandler(conversations.getConversation));
conversationsRouter.patch("/:id", validateBody(updateConversationSchema), asyncHandler(conversations.updateConversation));
conversationsRouter.delete("/:id", asyncHandler(conversations.deleteConversation));
conversationsRouter.post("/:id/members", validateBody(addMemberSchema), asyncHandler(conversations.addMember));
conversationsRouter.delete("/:id/members/:userId", asyncHandler(conversations.removeMember));

conversationsRouter.get(
  "/:id/messages",
  validateQuery(listMessagesQuerySchema),
  asyncHandler(messages.listMessages),
);
conversationsRouter.post("/:id/messages", validateBody(sendMessageSchema), asyncHandler(messages.sendMessage));
