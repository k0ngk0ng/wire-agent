#!/usr/bin/env node

import { DesktopExecutor } from "./executor.js";

const WS_URL = process.env.WIRE_AGENT_URL || "ws://localhost:3000";

async function main() {
  console.log("[DesktopExecutor] Starting...");
  console.log(`[DesktopExecutor] Connecting to ${WS_URL}`);

  const executor = new DesktopExecutor(WS_URL);
  await executor.connect();

  // Handle shutdown
  const shutdown = () => {
    console.log("[DesktopExecutor] Shutting down...");
    executor.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[DesktopExecutor] Fatal error:", err);
  process.exit(1);
});
