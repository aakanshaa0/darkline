import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import * as contacts from "../controllers/contacts.controller";
import { createContactSchema } from "../validation/contacts.validation";

export const contactsRouter: Router = Router();
contactsRouter.use(requireAuth);

contactsRouter.get("/", asyncHandler(contacts.listContacts));
contactsRouter.post("/", validateBody(createContactSchema), asyncHandler(contacts.createContact));
contactsRouter.delete("/:id", asyncHandler(contacts.deleteContact));
