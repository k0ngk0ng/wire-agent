import type { ActionHandler, ActionResult } from "./index.js";

// Dynamically import robotjs
let robot: typeof import("robotjs") | null = null;

async function getRobot(): Promise<typeof import("robotjs")> {
  if (!robot) {
    try {
      robot = await import("robotjs");
    } catch {
      throw new Error("robotjs not available on this platform");
    }
  }
  return robot;
}

// Key name mapping for robotjs
const KEY_MAP: Record<string, string> = {
  enter: "enter",
  return: "enter",
  tab: "tab",
  escape: "escape",
  esc: "escape",
  backspace: "backspace",
  delete: "delete",
  space: "space",
  " ": "space",
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  home: "home",
  end: "end",
  pageup: "pageup",
  pagedown: "pagedown",
  f1: "f1",
  f2: "f2",
  f3: "f3",
  f4: "f4",
  f5: "f5",
  f6: "f6",
  f7: "f7",
  f8: "f8",
  f9: "f9",
  f10: "f10",
  f11: "f11",
  f12: "f12",
};

export const keyboardHandlers: Record<string, ActionHandler> = {
  keyboard: async (params): Promise<ActionResult> => {
    const { key, modifiers = [] } = params as {
      key: string;
      modifiers?: ("ctrl" | "alt" | "shift" | "meta")[];
    };

    try {
      const r = await getRobot();

      // Convert key name
      const robotKey = KEY_MAP[key.toLowerCase()] || key.toLowerCase();

      // Convert modifier names
      const robotModifiers = modifiers.map((m) => {
        if (m === "meta") return "command";
        if (m === "ctrl") return "control";
        return m;
      });

      r.keyTap(robotKey, robotModifiers);

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  type: async (params): Promise<ActionResult> => {
    const { text } = params as { text: string };

    try {
      const r = await getRobot();
      r.typeString(text);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
