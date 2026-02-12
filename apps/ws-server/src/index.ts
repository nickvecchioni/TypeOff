import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@typeoff/shared";
import { authenticateSocket } from "./auth.js";
import { Matchmaker } from "./matchmaker.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

const matchmaker = new Matchmaker(io);

io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  socket.on("joinQueue", async (data) => {
    try {
      const player = await authenticateSocket(data, socket.id);
      matchmaker.addToQueue(socket, player);
    } catch (err) {
      socket.emit("error", {
        message: err instanceof Error ? err.message : "Auth failed",
      });
    }
  });

  socket.on("leaveQueue", () => {
    matchmaker.removeFromQueue(socket.id);
  });

  socket.on("raceProgress", (data) => {
    matchmaker.handleProgress(socket.id, data);
  });

  socket.on("raceFinish", (data) => {
    matchmaker.handleFinish(socket.id, data);
  });

  socket.on("disconnect", () => {
    console.log(`[disconnect] ${socket.id}`);
    matchmaker.handleDisconnect(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[ws-server] listening on port ${PORT}`);
});
