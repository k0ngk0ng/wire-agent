import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WebSocket } from "ws";
import { ExecutorManager } from "./manager";
import type { ExecutorRegister, ExecuteResult } from "@wire-agent/protocol";

// Mock the logger
vi.mock("../utils/logger", () => ({
  executorLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ExecutorManager", () => {
  let manager: ExecutorManager;
  let mockWs: WebSocket;

  beforeEach(() => {
    manager = new ExecutorManager();
    mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
    } as unknown as WebSocket;
  });

  afterEach(() => {
    manager.stopHeartbeat();
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new executor", () => {
      const info: ExecutorRegister = {
        type: "register",
        executorId: "test-executor",
        platform: "browser",
        capabilities: ["click", "type"],
        meta: { url: "https://example.com" },
      };

      manager.register(mockWs, info);

      const executors = manager.list();
      expect(executors).toHaveLength(1);
      expect(executors[0].executorId).toBe("test-executor");
      expect(executors[0].platform).toBe("browser");
    });

    it("should set first executor as default", () => {
      const info: ExecutorRegister = {
        type: "register",
        executorId: "test-executor",
        platform: "browser",
        capabilities: [],
        meta: {},
      };

      manager.register(mockWs, info);

      expect(manager.getDefault()).toBe("test-executor");
    });

    it("should replace existing executor with same ID", () => {
      const info: ExecutorRegister = {
        type: "register",
        executorId: "test-executor",
        platform: "browser",
        capabilities: [],
        meta: {},
      };

      const oldWs = { send: vi.fn(), close: vi.fn() } as unknown as WebSocket;
      manager.register(oldWs, info);
      manager.register(mockWs, info);

      expect(oldWs.close).toHaveBeenCalled();
      expect(manager.list()).toHaveLength(1);
    });
  });

  describe("unregister", () => {
    it("should unregister an executor", () => {
      const info: ExecutorRegister = {
        type: "register",
        executorId: "test-executor",
        platform: "browser",
        capabilities: [],
        meta: {},
      };

      manager.register(mockWs, info);
      manager.unregister("test-executor");

      expect(manager.list()).toHaveLength(0);
      expect(manager.getDefault()).toBeNull();
    });

    it("should update default when current default is unregistered", () => {
      const ws1 = { send: vi.fn(), close: vi.fn() } as unknown as WebSocket;
      const ws2 = { send: vi.fn(), close: vi.fn() } as unknown as WebSocket;

      manager.register(ws1, {
        type: "register",
        executorId: "executor-1",
        platform: "browser",
        capabilities: [],
        meta: {},
      });

      manager.register(ws2, {
        type: "register",
        executorId: "executor-2",
        platform: "browser",
        capabilities: [],
        meta: {},
      });

      expect(manager.getDefault()).toBe("executor-1");
      manager.unregister("executor-1");
      expect(manager.getDefault()).toBe("executor-2");
    });
  });

  describe("setDefault", () => {
    it("should set default executor", () => {
      const ws1 = { send: vi.fn(), close: vi.fn() } as unknown as WebSocket;
      const ws2 = { send: vi.fn(), close: vi.fn() } as unknown as WebSocket;

      manager.register(ws1, {
        type: "register",
        executorId: "executor-1",
        platform: "browser",
        capabilities: [],
        meta: {},
      });

      manager.register(ws2, {
        type: "register",
        executorId: "executor-2",
        platform: "browser",
        capabilities: [],
        meta: {},
      });

      expect(manager.setDefault("executor-2")).toBe(true);
      expect(manager.getDefault()).toBe("executor-2");
    });

    it("should return false for non-existent executor", () => {
      expect(manager.setDefault("non-existent")).toBe(false);
    });
  });

  describe("execute", () => {
    it("should return error when no executor connected", async () => {
      const result = await manager.execute("click", { selector: "button" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No executor connected");
    });

    it("should return error for non-existent executor ID", async () => {
      const result = await manager.execute("click", { selector: "button" }, "non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Executor not found: non-existent");
    });

    it("should send command to executor", async () => {
      manager.register(mockWs, {
        type: "register",
        executorId: "test-executor",
        platform: "browser",
        capabilities: ["click"],
        meta: {},
      });

      // Start execute but don't await yet
      const executePromise = manager.execute("click", { selector: "button" });

      // Simulate response
      const sentData = JSON.parse((mockWs.send as any).mock.calls[0][0]);
      const result: ExecuteResult = {
        type: "result",
        id: sentData.id,
        success: true,
      };
      manager.handleResult(result);

      const executeResult = await executePromise;
      expect(executeResult.success).toBe(true);
    });
  });

  describe("handleMessage", () => {
    it("should handle register message", () => {
      manager.handleMessage(mockWs, {
        type: "register",
        executorId: "test-executor",
        platform: "browser",
        capabilities: [],
        meta: {},
      });

      expect(manager.list()).toHaveLength(1);
    });

    it("should handle state update", () => {
      manager.register(mockWs, {
        type: "register",
        executorId: "test-executor",
        platform: "browser",
        capabilities: [],
        meta: { url: "https://old.com" },
      });

      manager.handleMessage(mockWs, {
        type: "state",
        executorId: "test-executor",
        meta: { url: "https://new.com" },
      });

      const executors = manager.list();
      expect(executors[0].meta.url).toBe("https://new.com");
    });

    it("should handle pong message", () => {
      manager.register(mockWs, {
        type: "register",
        executorId: "test-executor",
        platform: "browser",
        capabilities: [],
        meta: {},
      });

      const initialTime = manager.list()[0].lastActiveAt;

      manager.handleMessage(mockWs, {
        type: "pong",
        executorId: "test-executor",
        timestamp: Date.now(),
      });

      // lastActiveAt should be updated
      expect(manager.list()[0].lastActiveAt).toBeGreaterThanOrEqual(initialTime);
    });
  });
});
