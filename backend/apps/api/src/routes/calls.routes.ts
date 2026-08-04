import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody, validateQuery } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import * as calls from "../controllers/calls.controller";
import { createCallSchema, updateCallSchema, listCallsQuerySchema } from "../validation/calls.validation";

export const callsRouter: Router = Router();
callsRouter.use(requireAuth);

// Declared before "/:id"-shaped routes so the literal path wins.
callsRouter.get("/ice-servers", asyncHandler(calls.getIceServers));
callsRouter.get("/", validateQuery(listCallsQuerySchema), asyncHandler(calls.listCalls));
callsRouter.post("/", validateBody(createCallSchema), asyncHandler(calls.createCall));
callsRouter.patch("/:id", validateBody(updateCallSchema), asyncHandler(calls.updateCall));
