import pino from "pino";
import { env } from "@darkline/config";

export const logger = pino({ level: env.NODE_ENV === "production" ? "info" : "debug" });
