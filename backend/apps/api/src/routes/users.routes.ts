import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import * as users from "../controllers/users.controller";
import { updateMeSchema, deviceTokenSchema, linkAccountSchema } from "../validation/users.validation";

export const usersRouter: Router = Router();
usersRouter.use(requireAuth);

usersRouter.get("/me", asyncHandler(users.getMe));
usersRouter.patch("/me", validateBody(updateMeSchema), asyncHandler(users.updateMe));
usersRouter.get("/search", asyncHandler(users.searchUsers));
usersRouter.get("/me/linked-accounts", asyncHandler(users.getLinkedAccounts));
usersRouter.post("/me/linked-accounts", validateBody(linkAccountSchema), asyncHandler(users.linkAccount));
usersRouter.delete("/me/linked-accounts/:provider", asyncHandler(users.unlinkAccount));
usersRouter.post("/me/device-token", validateBody(deviceTokenSchema), asyncHandler(users.addDeviceToken));
usersRouter.get("/:id", asyncHandler(users.getUserById));
