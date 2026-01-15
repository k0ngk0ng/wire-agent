import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import type { ActionHandler, ActionResult } from "./index.js";

const execAsync = promisify(exec);

// Dynamically import node-notifier
let notifier: typeof import("node-notifier") | null = null;

async function getNotifier(): Promise<typeof import("node-notifier")> {
  if (!notifier) {
    try {
      notifier = await import("node-notifier");
    } catch {
      throw new Error("node-notifier not available");
    }
  }
  return notifier;
}

export const systemHandlers: Record<string, ActionHandler> = {
  shellExec: async (params): Promise<ActionResult> => {
    const { command, cwd, timeout = 30000 } = params as {
      command: string;
      cwd?: string;
      timeout?: number;
    };

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || process.cwd(),
        timeout,
      });

      return {
        success: true,
        data: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        },
      };
    } catch (err) {
      const error = err as Error & { stdout?: string; stderr?: string; code?: number };
      return {
        success: false,
        error: error.message,
        data: {
          stdout: error.stdout?.trim() || "",
          stderr: error.stderr?.trim() || "",
          code: error.code,
        },
      };
    }
  },

  appLaunch: async (params): Promise<ActionResult> => {
    const { path: appPath, args = [] } = params as {
      path: string;
      args?: string[];
    };

    try {
      const child = spawn(appPath, args, {
        detached: true,
        stdio: "ignore",
      });
      child.unref();

      return { success: true, data: { pid: child.pid } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  appClose: async (params): Promise<ActionResult> => {
    const { processName, pid } = params as {
      processName?: string;
      pid?: number;
    };

    if (!processName && !pid) {
      return { success: false, error: "Must specify processName or pid" };
    }

    try {
      if (pid) {
        process.kill(pid, "SIGTERM");
      } else if (processName) {
        const platform = process.platform;
        if (platform === "win32") {
          await execAsync(`taskkill /IM "${processName}" /F`);
        } else {
          await execAsync(`pkill -f "${processName}"`);
        }
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  fileRead: async (params): Promise<ActionResult> => {
    const { path: filePath, encoding = "utf8" } = params as {
      path: string;
      encoding?: BufferEncoding;
    };

    try {
      const content = await fs.readFile(filePath, { encoding });
      return { success: true, data: content };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  fileWrite: async (params): Promise<ActionResult> => {
    const { path: filePath, content, encoding = "utf8" } = params as {
      path: string;
      content: string;
      encoding?: BufferEncoding;
    };

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, { encoding });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  fileExists: async (params): Promise<ActionResult> => {
    const { path: filePath } = params as { path: string };

    try {
      await fs.access(filePath);
      return { success: true, data: true };
    } catch {
      return { success: true, data: false };
    }
  },

  notify: async (params): Promise<ActionResult> => {
    const { title, message, icon } = params as {
      title: string;
      message: string;
      icon?: string;
    };

    try {
      const n = await getNotifier();
      n.notify({
        title,
        message,
        icon,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
