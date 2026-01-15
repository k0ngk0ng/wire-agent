import { mouseHandlers } from "./mouse.js";
import { keyboardHandlers } from "./keyboard.js";
import { windowHandlers } from "./window.js";
import { clipboardHandlers } from "./clipboard.js";
import { systemHandlers } from "./system.js";
import { screenshotHandler } from "./screenshot.js";

export type ActionResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export type ActionHandler = (params: Record<string, unknown>) => Promise<ActionResult>;

export class ActionHandlers {
  private handlers: Map<string, ActionHandler> = new Map();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Mouse handlers
    for (const [name, handler] of Object.entries(mouseHandlers)) {
      this.handlers.set(name, handler);
    }

    // Keyboard handlers
    for (const [name, handler] of Object.entries(keyboardHandlers)) {
      this.handlers.set(name, handler);
    }

    // Window handlers
    for (const [name, handler] of Object.entries(windowHandlers)) {
      this.handlers.set(name, handler);
    }

    // Clipboard handlers
    for (const [name, handler] of Object.entries(clipboardHandlers)) {
      this.handlers.set(name, handler);
    }

    // System handlers
    for (const [name, handler] of Object.entries(systemHandlers)) {
      this.handlers.set(name, handler);
    }

    // Screenshot
    this.handlers.set("screenshot", screenshotHandler);
  }

  get(action: string): ActionHandler | undefined {
    return this.handlers.get(action);
  }

  list(): string[] {
    return Array.from(this.handlers.keys());
  }
}
