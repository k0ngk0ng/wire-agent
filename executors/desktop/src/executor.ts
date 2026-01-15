import WebSocket from "ws";
import os from "os";
import {
  ExecutorRegister,
  ExecuteCommand,
  ExecuteResult,
  ControlCommand,
  DesktopOS,
  DESKTOP_CAPABILITIES,
} from "@wire-agent/protocol";
import { ActionHandlers } from "./handlers/index.js";

export class DesktopExecutor {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly RECONNECT_INTERVAL = 3000;
  private executorId: string;
  private handlers: ActionHandlers;

  constructor(wsUrl: string) {
    this.wsUrl = wsUrl;
    this.executorId = this.generateExecutorId();
    this.handlers = new ActionHandlers();
  }

  private generateExecutorId(): string {
    const hostname = os.hostname();
    const platform = this.getOS();
    return `desktop:${platform}:${hostname}`;
  }

  private getOS(): DesktopOS {
    const platform = os.platform();
    switch (platform) {
      case "win32":
        return "windows";
      case "darwin":
        return "macos";
      case "linux":
        return "linux";
      default:
        return "linux";
    }
  }

  private getScreenSize(): { width: number; height: number } {
    // Default screen size - will be updated by handlers if robotjs is available
    return { width: 1920, height: 1080 };
  }

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.on("open", () => {
          console.log("[DesktopExecutor] Connected to server");
          this.register();
          resolve();
        });

        this.ws.on("message", async (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            await this.handleMessage(message);
          } catch (err) {
            console.error("[DesktopExecutor] Failed to handle message:", err);
          }
        });

        this.ws.on("close", () => {
          console.log("[DesktopExecutor] Disconnected from server");
          this.ws = null;
          this.scheduleReconnect();
        });

        this.ws.on("error", (err) => {
          console.error("[DesktopExecutor] WebSocket error:", err);
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((err) => {
        console.error("[DesktopExecutor] Reconnect failed:", err);
      });
    }, this.RECONNECT_INTERVAL);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private send(message: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private register(): void {
    const registration: ExecutorRegister = {
      type: "register",
      executorId: this.executorId,
      platform: "desktop",
      capabilities: [...DESKTOP_CAPABILITIES],
      meta: {
        os: this.getOS(),
        hostname: os.hostname(),
        username: os.userInfo().username,
        screenSize: this.getScreenSize(),
        osVersion: os.release(),
      },
    };
    this.send(registration);
    console.log(`[DesktopExecutor] Registered as ${this.executorId}`);
  }

  private async handleMessage(
    message: ExecuteCommand | ControlCommand
  ): Promise<void> {
    if (message.type === "execute") {
      const result = await this.executeAction(message);
      this.send(result);
    } else if (message.type === "control") {
      if (message.action === "ping") {
        this.send({
          type: "pong",
          executorId: this.executorId,
          timestamp: Date.now(),
        });
      } else if (message.action === "disconnect") {
        this.disconnect();
      }
    }
  }

  private async executeAction(command: ExecuteCommand): Promise<ExecuteResult> {
    const { id, action, params } = command;

    try {
      const handler = this.handlers.get(action);
      if (!handler) {
        return {
          type: "result",
          id,
          success: false,
          error: `Unknown action: ${action}`,
        };
      }

      const result = await handler(params);
      return {
        type: "result",
        id,
        ...result,
      };
    } catch (err) {
      return {
        type: "result",
        id,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
