import type { ActionResult } from "./index.js";

// Dynamically import screenshot-desktop
type ScreenshotFn = (options?: { screen?: number }) => Promise<Buffer>;
let screenshotFn: ScreenshotFn | null = null;

async function getScreenshot(): Promise<ScreenshotFn> {
  if (!screenshotFn) {
    try {
      const mod = await import("screenshot-desktop");
      // Handle both ESM default export and CommonJS
      screenshotFn = (mod as { default?: ScreenshotFn }).default ?? (mod as unknown as ScreenshotFn);
    } catch {
      throw new Error("screenshot-desktop not available");
    }
  }
  return screenshotFn;
}

export const screenshotHandler = async (params: Record<string, unknown>): Promise<ActionResult> => {
  const { screen = 0 } = params as { screen?: number };

  try {
    const capture = await getScreenshot();
    const buffer = await capture({ screen });
    const base64 = buffer.toString("base64");
    return { success: true, data: base64 };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
