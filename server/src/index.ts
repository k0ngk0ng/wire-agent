#!/usr/bin/env node

import { startMcpServer } from "./mcp/server";
import { startWebSocketServer, stopWebSocketServer } from "./ws/server";
import { logger } from "./utils/logger";

const log = logger.child("Main");

async function main() {
  log.info("Wire Agent starting...");

  // Start WebSocket server for executor connections
  startWebSocketServer();

  // Start MCP server on stdio for Claude Code
  await startMcpServer();
}

// Graceful shutdown
function shutdown(signal: string) {
  log.info(`Received ${signal}, shutting down...`);
  stopWebSocketServer();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

main().catch((err) => {
  log.error("Fatal error", err);
  process.exit(1);
});
