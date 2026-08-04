import http from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { env } from "@darkline/config";
import { socketAuthMiddleware } from "./socket/auth";
import { registerSocketHandlers } from "./socket/handlers";

export function createServer(): http.Server {
  const httpServer = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const io = new Server(httpServer, { cors: { origin: "*" } });

  // Redis adapter wired from day 1 even at a single instance (Part G.2) —
  // this is what lets fanout-worker's redis-emitter (a separate process)
  // deliver events into rooms on *this* process's sockets.
  const pubClient = new Redis(env.REDIS_URL);
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use(socketAuthMiddleware);
  io.on("connection", (socket) => registerSocketHandlers(io, socket));

  return httpServer;
}
