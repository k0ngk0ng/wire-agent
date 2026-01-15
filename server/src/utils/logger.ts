// Wire Agent - Logger Utility
// Provides structured logging with levels and timestamps

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m",  // Green
  warn: "\x1b[33m",  // Yellow
  error: "\x1b[31m", // Red
};

const RESET_COLOR = "\x1b[0m";

class Logger {
  private minLevel: LogLevel;
  private prefix: string;

  constructor(prefix = "WireAgent", minLevel: LogLevel = "info") {
    this.prefix = prefix;
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatMessage(level: LogLevel, module: string, message: string): string {
    const timestamp = new Date().toISOString();
    const color = LOG_COLORS[level];
    const levelStr = level.toUpperCase().padEnd(5);
    return `${color}[${timestamp}] [${levelStr}] [${this.prefix}:${module}]${RESET_COLOR} ${message}`;
  }

  private log(level: LogLevel, module: string, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, module, message);
    const output = level === "error" ? console.error : console.log;

    if (data !== undefined) {
      output(formattedMessage, typeof data === "object" ? JSON.stringify(data, null, 2) : data);
    } else {
      output(formattedMessage);
    }
  }

  debug(module: string, message: string, data?: unknown): void {
    this.log("debug", module, message, data);
  }

  info(module: string, message: string, data?: unknown): void {
    this.log("info", module, message, data);
  }

  warn(module: string, message: string, data?: unknown): void {
    this.log("warn", module, message, data);
  }

  error(module: string, message: string, data?: unknown): void {
    this.log("error", module, message, data);
  }

  // Create a child logger with a specific module prefix
  child(module: string): ModuleLogger {
    return new ModuleLogger(this, module);
  }
}

class ModuleLogger {
  private logger: Logger;
  private module: string;

  constructor(logger: Logger, module: string) {
    this.logger = logger;
    this.module = module;
  }

  debug(message: string, data?: unknown): void {
    this.logger.debug(this.module, message, data);
  }

  info(message: string, data?: unknown): void {
    this.logger.info(this.module, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.logger.warn(this.module, message, data);
  }

  error(message: string, data?: unknown): void {
    this.logger.error(this.module, message, data);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export module loggers for convenience
export const mcpLogger = logger.child("MCP");
export const wsLogger = logger.child("WebSocket");
export const executorLogger = logger.child("Executor");
