import { WebSocketServer, WebSocket } from "ws";
import { ClientMessage } from "@wire-agent/protocol";
import { executorManager } from "../executor/manager";
import { wsLogger as log } from "../utils/logger";

const WS_PORT = parseInt(process.env.WS_PORT || "3000", 10);

let wss: WebSocketServer | null = null;

export function startWebSocketServer(): WebSocketServer {
  if (wss) return wss;

  wss = new WebSocketServer({ port: WS_PORT });

  wss.on("listening", () => {
    log.info(`Server listening on ws://localhost:${WS_PORT}`);
  });

  wss.on("connection", (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress || "unknown";
    log.info(`New connection from ${clientIp}`);

    ws.on("message", (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        executorManager.handleMessage(ws, message);
      } catch (err) {
        log.error("Failed to parse message", err);
      }
    });

    ws.on("close", (code, reason) => {
      log.info(`Connection closed`, { code, reason: reason.toString() });
      executorManager.unregisterByWs(ws);
    });

    ws.on("error", (err) => {
      log.error("Connection error", err);
      executorManager.unregisterByWs(ws);
    });
  });

  wss.on("error", (err) => {
    log.error("Server error", err);
  });

  return wss;
}

export function stopWebSocketServer(): void {
  if (wss) {
    log.info("Stopping WebSocket server");
    wss.close();
    wss = null;
  }
}
