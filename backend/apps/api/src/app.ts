import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/users.routes";
import { contactsRouter } from "./routes/contacts.routes";
import { conversationsRouter } from "./routes/conversations.routes";
import { messagesRouter } from "./routes/messages.routes";
import { callsRouter } from "./routes/calls.routes";
import { prekeysRouter } from "./routes/prekeys.routes";
import { mediaRouter } from "./routes/media.routes";
import { presenceRouter } from "./routes/presence.routes";
import { notFoundHandler } from "./middleware/notFoundHandler";
import { errorHandler } from "./middleware/errorHandler";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/contacts", contactsRouter);
  app.use("/conversations", conversationsRouter);
  app.use("/messages", messagesRouter);
  app.use("/calls", callsRouter);
  app.use("/keys/prekeys", prekeysRouter);
  app.use("/media", mediaRouter);
  app.use("/presence", presenceRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
