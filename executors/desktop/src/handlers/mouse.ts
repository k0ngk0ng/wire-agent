import type { ActionHandler, ActionResult } from "./index.js";

// Dynamically import robotjs to handle platforms where it's not available
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

export const mouseHandlers: Record<string, ActionHandler> = {
  mouseClick: async (params): Promise<ActionResult> => {
    const { x, y, button = "left", clicks = 1 } = params as {
      x: number;
      y: number;
      button?: "left" | "right" | "middle";
      clicks?: number;
    };

    try {
      const r = await getRobot();
      r.moveMouse(x, y);

      for (let i = 0; i < clicks; i++) {
        r.mouseClick(button);
        if (i < clicks - 1) {
          r.setMouseDelay(50);
        }
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  mouseMove: async (params): Promise<ActionResult> => {
    const { x, y, duration = 0 } = params as {
      x: number;
      y: number;
      duration?: number;
    };

    try {
      const r = await getRobot();

      if (duration > 0) {
        const currentPos = r.getMousePos();
        const steps = Math.max(10, Math.floor(duration / 10));
        const dx = (x - currentPos.x) / steps;
        const dy = (y - currentPos.y) / steps;

        for (let i = 1; i <= steps; i++) {
          r.moveMouse(
            Math.round(currentPos.x + dx * i),
            Math.round(currentPos.y + dy * i)
          );
          await new Promise((resolve) => setTimeout(resolve, duration / steps));
        }
      } else {
        r.moveMouse(x, y);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  mouseDrag: async (params): Promise<ActionResult> => {
    const { startX, startY, endX, endY, duration = 500 } = params as {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      duration?: number;
    };

    try {
      const r = await getRobot();

      // Move to start position
      r.moveMouse(startX, startY);

      // Press mouse button
      r.mouseToggle("down");

      // Drag to end position
      const steps = Math.max(10, Math.floor(duration / 10));
      const dx = (endX - startX) / steps;
      const dy = (endY - startY) / steps;

      for (let i = 1; i <= steps; i++) {
        r.moveMouse(
          Math.round(startX + dx * i),
          Math.round(startY + dy * i)
        );
        await new Promise((resolve) => setTimeout(resolve, duration / steps));
      }

      // Release mouse button
      r.mouseToggle("up");

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  scroll: async (params): Promise<ActionResult> => {
    const { direction, amount = 3 } = params as {
      direction: "up" | "down" | "left" | "right";
      amount?: number;
    };

    try {
      const r = await getRobot();

      const scrollAmount = direction === "up" || direction === "left" ? amount : -amount;

      if (direction === "up" || direction === "down") {
        r.scrollMouse(0, scrollAmount);
      } else {
        r.scrollMouse(scrollAmount, 0);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
