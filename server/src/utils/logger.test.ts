import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Logger", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.LOG_LEVEL;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.LOG_LEVEL = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("should log info messages", async () => {
    process.env.LOG_LEVEL = "info";
    const { logger } = await import("./logger");

    logger.info("Test", "Test message");

    expect(console.log).toHaveBeenCalled();
    const call = (console.log as any).mock.calls[0][0];
    expect(call).toContain("INFO");
    expect(call).toContain("Test message");
  });

  it("should log error messages to stderr", async () => {
    process.env.LOG_LEVEL = "error";
    const { logger } = await import("./logger");

    logger.error("Test", "Error message");

    expect(console.error).toHaveBeenCalled();
    const call = (console.error as any).mock.calls[0][0];
    expect(call).toContain("ERROR");
    expect(call).toContain("Error message");
  });

  it("should filter messages below minimum level", async () => {
    process.env.LOG_LEVEL = "warn";
    const { logger } = await import("./logger");

    logger.debug("Test", "Debug message");
    logger.info("Test", "Info message");

    expect(console.log).not.toHaveBeenCalled();
  });

  it("should create child loggers with module prefix", async () => {
    process.env.LOG_LEVEL = "info";
    const { logger } = await import("./logger");

    const childLogger = logger.child("MyModule");
    childLogger.info("Child message");

    expect(console.log).toHaveBeenCalled();
    const call = (console.log as any).mock.calls[0][0];
    expect(call).toContain("MyModule");
    expect(call).toContain("Child message");
  });

  it("should log data when provided", async () => {
    process.env.LOG_LEVEL = "info";
    const { logger } = await import("./logger");

    logger.info("Test", "Message with data", { key: "value" });

    expect(console.log).toHaveBeenCalled();
    const calls = (console.log as any).mock.calls[0];
    expect(calls[1]).toContain("key");
    expect(calls[1]).toContain("value");
  });
});
