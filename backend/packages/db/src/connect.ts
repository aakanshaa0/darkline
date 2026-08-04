import mongoose from "mongoose";

let connectPromise: Promise<typeof mongoose> | null = null;

/**
 * Idempotent — safe to call from every service's bootstrap; the underlying
 * mongoose connection is a singleton per process, this just avoids each
 * caller racing its own connect() attempt.
 */
export function connectDB(mongoUri: string): Promise<typeof mongoose> {
  if (!connectPromise) {
    connectPromise = mongoose.connect(mongoUri);
  }
  return connectPromise;
}

export { mongoose };
