import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import * as media from "../controllers/media.controller";
import { requestUploadSchema } from "../validation/media.validation";

export const mediaRouter: Router = Router();
mediaRouter.use(requireAuth);

mediaRouter.post("/upload", validateBody(requestUploadSchema), asyncHandler(media.requestUpload));
mediaRouter.get("/:id", asyncHandler(media.getMedia));
