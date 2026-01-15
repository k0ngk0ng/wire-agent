import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import type { ActionHandler, ActionResult } from "./index.js";

const execAsync = promisify(exec);

// Try to get active-win for window info
let activeWin: typeof import("active-win") | null = null;

async function getActiveWin(): Promise<typeof import("active-win") | null> {
  if (activeWin === null) {
    try {
      activeWin = await import("active-win");
    } catch {
      activeWin = undefined as unknown as null;
    }
  }
  return activeWin;
}

export const windowHandlers: Record<string, ActionHandler> = {
  windowList: async (params): Promise<ActionResult> => {
    const { includeMinimized = false } = params as { includeMinimized?: boolean };

    try {
      const platform = os.platform();
      let windows: Array<{ title: string; processName: string; pid?: number }> = [];

      if (platform === "darwin") {
        // macOS: Use AppleScript
        const script = `
          tell application "System Events"
            set windowList to {}
            repeat with proc in (every process whose background only is false)
              try
                repeat with win in (every window of proc)
                  set end of windowList to {name of proc, name of win}
                end repeat
              end try
            end repeat
            return windowList
          end tell
        `;
        const { stdout } = await execAsync(`osascript -e '${script}'`);
        const matches = stdout.matchAll(/(\w+), (.+?)(?:,|$)/g);
        for (const match of matches) {
          windows.push({ processName: match[1], title: match[2] });
        }
      } else if (platform === "win32") {
        // Windows: Use PowerShell
        const { stdout } = await execAsync(
          `powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object ProcessName, MainWindowTitle, Id | ConvertTo-Json"`
        );
        const procs = JSON.parse(stdout || "[]");
        windows = (Array.isArray(procs) ? procs : [procs]).map((p: { ProcessName: string; MainWindowTitle: string; Id: number }) => ({
          processName: p.ProcessName,
          title: p.MainWindowTitle,
          pid: p.Id,
        }));
      } else {
        // Linux: Use wmctrl if available
        try {
          const { stdout } = await execAsync("wmctrl -l -p");
          const lines = stdout.split("\n").filter(Boolean);
          for (const line of lines) {
            const parts = line.split(/\s+/);
            const title = parts.slice(4).join(" ");
            windows.push({ processName: "unknown", title, pid: parseInt(parts[2]) });
          }
        } catch {
          return { success: false, error: "wmctrl not available. Install with: sudo apt install wmctrl" };
        }
      }

      return { success: true, data: windows };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  windowFocus: async (params): Promise<ActionResult> => {
    const { title, processName } = params as { title?: string; processName?: string };

    if (!title && !processName) {
      return { success: false, error: "Must specify title or processName" };
    }

    try {
      const platform = os.platform();

      if (platform === "darwin") {
        if (processName) {
          await execAsync(`osascript -e 'tell application "${processName}" to activate'`);
        } else if (title) {
          const script = `
            tell application "System Events"
              set frontmost of (first process whose (name of every window contains "${title}")) to true
            end tell
          `;
          await execAsync(`osascript -e '${script}'`);
        }
      } else if (platform === "win32") {
        const filter = title
          ? `Where-Object {$_.MainWindowTitle -like "*${title}*"}`
          : `Where-Object {$_.ProcessName -like "*${processName}*"}`;
        await execAsync(
          `powershell -Command "$p = Get-Process | ${filter} | Select-Object -First 1; [Microsoft.VisualBasic.Interaction]::AppActivate($p.Id)"`
        );
      } else {
        // Linux
        if (title) {
          await execAsync(`wmctrl -a "${title}"`);
        }
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  windowState: async (params): Promise<ActionResult> => {
    const { title, processName, state } = params as {
      title?: string;
      processName?: string;
      state: "minimize" | "maximize" | "restore" | "close";
    };

    try {
      const platform = os.platform();

      if (platform === "darwin") {
        const app = processName || title;
        const actions: Record<string, string> = {
          minimize: `tell application "System Events" to set miniaturized of every window of process "${app}" to true`,
          maximize: `tell application "${app}" to set bounds of front window to {0, 0, 1920, 1080}`,
          restore: `tell application "System Events" to set miniaturized of every window of process "${app}" to false`,
          close: `tell application "${app}" to close front window`,
        };
        await execAsync(`osascript -e '${actions[state]}'`);
      } else if (platform === "win32") {
        const filter = title
          ? `Where-Object {$_.MainWindowTitle -like "*${title}*"}`
          : `Where-Object {$_.ProcessName -like "*${processName}*"}`;

        const actions: Record<string, string> = {
          minimize: `(New-Object -ComObject Shell.Application).MinimizeAll()`,
          maximize: `Add-Type -Name Win32 -Namespace Native -MemberDefinition '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);'; $p = Get-Process | ${filter} | Select-Object -First 1; [Native.Win32]::ShowWindow($p.MainWindowHandle, 3)`,
          restore: `Add-Type -Name Win32 -Namespace Native -MemberDefinition '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);'; $p = Get-Process | ${filter} | Select-Object -First 1; [Native.Win32]::ShowWindow($p.MainWindowHandle, 9)`,
          close: `(Get-Process | ${filter} | Select-Object -First 1).CloseMainWindow()`,
        };
        await execAsync(`powershell -Command "${actions[state]}"`);
      } else {
        // Linux
        const windowArg = title ? `-r "${title}"` : "";
        const actions: Record<string, string> = {
          minimize: `wmctrl ${windowArg} -b add,hidden`,
          maximize: `wmctrl ${windowArg} -b add,maximized_vert,maximized_horz`,
          restore: `wmctrl ${windowArg} -b remove,maximized_vert,maximized_horz,hidden`,
          close: `wmctrl ${windowArg} -c "${title}"`,
        };
        await execAsync(actions[state]);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  windowResize: async (params): Promise<ActionResult> => {
    const { title, processName, width, height } = params as {
      title?: string;
      processName?: string;
      width: number;
      height: number;
    };

    try {
      const platform = os.platform();

      if (platform === "darwin") {
        const app = processName || title;
        await execAsync(
          `osascript -e 'tell application "${app}" to set bounds of front window to {0, 0, ${width}, ${height}}'`
        );
      } else if (platform === "win32") {
        return { success: false, error: "Window resize not fully implemented for Windows" };
      } else {
        if (title) {
          await execAsync(`wmctrl -r "${title}" -e 0,-1,-1,${width},${height}`);
        }
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  windowMove: async (params): Promise<ActionResult> => {
    const { title, processName, x, y } = params as {
      title?: string;
      processName?: string;
      x: number;
      y: number;
    };

    try {
      const platform = os.platform();

      if (platform === "darwin") {
        const app = processName || title;
        await execAsync(
          `osascript -e 'tell application "${app}" to set position of front window to {${x}, ${y}}'`
        );
      } else if (platform === "linux") {
        if (title) {
          await execAsync(`wmctrl -r "${title}" -e 0,${x},${y},-1,-1`);
        }
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
