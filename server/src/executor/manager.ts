import { WebSocket } from "ws";
import {
  ExecutorInfo,
  ExecutorRegister,
  ExecuteCommand,
  ExecuteResult,
  ClientMessage,
  ControlCommand,
} from "@wire-agent/protocol";
import { executorLogger as log } from "../utils/logger";

interface ExecutorConnection {
  ws: WebSocket;
  info: ExecutorRegister;
  connectedAt: number;
  lastActiveAt: number;
  pendingRequests: Map<string, {
    resolve: (result: ExecuteResult) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>;
}

export class ExecutorManager {
  private executors: Map<string, ExecutorConnection> = new Map();
  private defaultExecutorId: string | null = null;
  private requestTimeout: number = 30000; // 30 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 15000; // 15 seconds
  private readonly HEARTBEAT_TIMEOUT = 45000; // 45 seconds (3 missed heartbeats)

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      this.checkConnections();
    }, this.HEARTBEAT_INTERVAL);

    log.info("Heartbeat monitoring started");
  }

  private checkConnections(): void {
    const now = Date.now();

    for (const [id, conn] of this.executors) {
      // Check for stale connections
      if (now - conn.lastActiveAt > this.HEARTBEAT_TIMEOUT) {
        log.warn(`Executor ${id} appears stale, sending ping`);
        this.sendPing(conn);
      }
    }
  }

  private sendPing(conn: ExecutorConnection): void {
    try {
      const pingCommand: ControlCommand = {
        type: "control",
        action: "ping",
      };
      conn.ws.send(JSON.stringify(pingCommand));
    } catch (err) {
      log.error(`Failed to send ping to ${conn.info.executorId}`, err);
    }
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      log.info("Heartbeat monitoring stopped");
    }
  }

  register(ws: WebSocket, info: ExecutorRegister): void {
    const existing = this.executors.get(info.executorId);
    if (existing) {
      log.info(`Replacing existing executor: ${info.executorId}`);
      existing.ws.close();
    }

    const now = Date.now();
    this.executors.set(info.executorId, {
      ws,
      info,
      connectedAt: now,
      lastActiveAt: now,
      pendingRequests: new Map(),
    });

    // Set as default if first executor
    if (!this.defaultExecutorId) {
      this.defaultExecutorId = info.executorId;
      log.info(`Set default executor: ${info.executorId}`);
    }

    log.info(`Registered: ${info.executorId} (${info.platform})`, {
      capabilities: info.capabilities,
      meta: info.meta,
    });
  }

  unregister(executorId: string): void {
    const conn = this.executors.get(executorId);
    if (conn) {
      // Reject all pending requests
      const pendingCount = conn.pendingRequests.size;
      for (const [id, pending] of conn.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Executor disconnected"));
      }
      this.executors.delete(executorId);

      // Update default if needed
      if (this.defaultExecutorId === executorId) {
        const remaining = Array.from(this.executors.keys());
        this.defaultExecutorId = remaining.length > 0 ? remaining[0] : null;
        if (this.defaultExecutorId) {
          log.info(`New default executor: ${this.defaultExecutorId}`);
        }
      }

      log.info(`Unregistered: ${executorId}`, { pendingRequestsRejected: pendingCount });
    }
  }

  unregisterByWs(ws: WebSocket): void {
    for (const [id, conn] of this.executors) {
      if (conn.ws === ws) {
        this.unregister(id);
        return;
      }
    }
  }

  getExecutor(executorId?: string): ExecutorConnection | null {
    const id = executorId || this.defaultExecutorId;
    if (!id) return null;
    return this.executors.get(id) || null;
  }

  setDefault(executorId: string): boolean {
    if (this.executors.has(executorId)) {
      this.defaultExecutorId = executorId;
      return true;
    }
    return false;
  }

  getDefault(): string | null {
    return this.defaultExecutorId;
  }

  list(): ExecutorInfo[] {
    return Array.from(this.executors.values()).map((conn) => ({
      executorId: conn.info.executorId,
      platform: conn.info.platform,
      capabilities: conn.info.capabilities,
      meta: conn.info.meta,
      connectedAt: conn.connectedAt,
      lastActiveAt: conn.lastActiveAt,
    }));
  }

  async execute(
    action: string,
    params: Record<string, unknown>,
    executorId?: string
  ): Promise<ExecuteResult> {
    const conn = this.getExecutor(executorId);
    if (!conn) {
      const error = executorId
        ? `Executor not found: ${executorId}`
        : "No executor connected";
      log.warn(`Execute failed: ${error}`);
      return {
        type: "result",
        id: "",
        success: false,
        error,
      };
    }

    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const command: ExecuteCommand = {
      type: "execute",
      id,
      action,
      params,
    };

    log.debug(`Executing ${action} on ${conn.info.executorId}`, { id, params });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        conn.pendingRequests.delete(id);
        log.warn(`Request timeout: ${id}`, { action, executorId: conn.info.executorId });
        resolve({
          type: "result",
          id,
          success: false,
          error: `Request timeout after ${this.requestTimeout}ms`,
        });
      }, this.requestTimeout);

      conn.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        conn.ws.send(JSON.stringify(command));
        conn.lastActiveAt = Date.now();
      } catch (err) {
        conn.pendingRequests.delete(id);
        clearTimeout(timeout);
        log.error(`Failed to send command: ${id}`, err);
        resolve({
          type: "result",
          id,
          success: false,
          error: `Failed to send command: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    });
  }

  handleResult(result: ExecuteResult): void {
    // Find the executor with this pending request
    for (const conn of this.executors.values()) {
      const pending = conn.pendingRequests.get(result.id);
      if (pending) {
        clearTimeout(pending.timeout);
        conn.pendingRequests.delete(result.id);
        log.debug(`Result received: ${result.id}`, { success: result.success });
        pending.resolve(result);
        return;
      }
    }
    log.warn(`No pending request for: ${result.id}`);
  }

  updateState(executorId: string, meta: Record<string, unknown>): void {
    const conn = this.executors.get(executorId);
    if (conn) {
      conn.info.meta = { ...conn.info.meta, ...meta };
      conn.lastActiveAt = Date.now();
      log.debug(`State updated: ${executorId}`, meta);
    }
  }

  handleMessage(ws: WebSocket, message: ClientMessage): void {
    switch (message.type) {
      case "register":
        this.register(ws, message);
        break;
      case "result":
        this.handleResult(message);
        break;
      case "state":
        this.updateState(message.executorId, message.meta);
        break;
      case "pong":
        const conn = this.executors.get(message.executorId);
        if (conn) {
          conn.lastActiveAt = Date.now();
          log.debug(`Pong received from ${message.executorId}`);
        }
        break;
    }
  }
}

// Singleton instance
export const executorManager = new ExecutorManager();
