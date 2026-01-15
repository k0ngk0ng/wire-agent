import type { ActionHandler, ActionResult } from "./index.js";

// Dynamically import clipboardy (ESM module)
type ClipboardRead = () => Promise<string>;
type ClipboardWrite = (text: string) => Promise<void>;
let clipboardReadFn: ClipboardRead | null = null;
let clipboardWriteFn: ClipboardWrite | null = null;

async function loadClipboard(): Promise<void> {
  if (!clipboardReadFn) {
    try {
      const cb = await import("clipboardy");
      clipboardReadFn = cb.read;
      clipboardWriteFn = cb.write;
    } catch {
      throw new Error("clipboardy not available");
    }
  }
}

export const clipboardHandlers: Record<string, ActionHandler> = {
  clipboardRead: async (params): Promise<ActionResult> => {
    const { format = "text" } = params as { format?: "text" | "html" | "image" };

    if (format !== "text") {
      return { success: false, error: `Format "${format}" not supported yet, only "text" is available` };
    }

    try {
      await loadClipboard();
      const text = await clipboardReadFn!();
      return { success: true, data: text };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  clipboardWrite: async (params): Promise<ActionResult> => {
    const { text } = params as { text: string };

    try {
      await loadClipboard();
      await clipboardWriteFn!(text);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
