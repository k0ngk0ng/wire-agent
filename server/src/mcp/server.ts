import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { executorManager } from "../executor/manager";
import { mcpLogger as log } from "../utils/logger";

// Tool definitions
const tools = [
  {
    name: "executor_list",
    description: "List all connected executors (browsers, mobile devices, etc.)",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "executor_use",
    description: "Set the default executor for subsequent commands",
    inputSchema: {
      type: "object" as const,
      properties: {
        executorId: {
          type: "string",
          description: "The executor ID to use as default",
        },
      },
      required: ["executorId"],
    },
  },
  {
    name: "ui_navigate",
    description: "Navigate to a URL in the browser or open a deep link in mobile app",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The URL to navigate to",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional, uses default if not specified)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "ui_click",
    description: "Click on an element identified by selector",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector, XPath, or accessibility ID",
        },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_type",
    description: "Type text into an input element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector, XPath, or accessibility ID of the input",
        },
        text: {
          type: "string",
          description: "Text to type",
        },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        clearFirst: {
          type: "boolean",
          description: "Clear existing content before typing (default: false)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "ui_scroll",
    description: "Scroll the page or a specific element",
    inputSchema: {
      type: "object" as const,
      properties: {
        direction: {
          type: "string",
          enum: ["up", "down", "left", "right"],
          description: "Scroll direction",
        },
        amount: {
          type: "number",
          description: "Scroll amount in pixels (default: 300)",
        },
        selector: {
          type: "string",
          description: "Element to scroll (scrolls page if not specified)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: ["direction"],
    },
  },
  {
    name: "ui_screenshot",
    description: "Take a screenshot of the page or a specific element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "Element to screenshot (full page if not specified)",
        },
        fullPage: {
          type: "boolean",
          description: "Capture full scrollable page (default: false)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: [],
    },
  },
  {
    name: "ui_get_content",
    description: "Get text content or HTML of the page or a specific element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "Element selector (entire page if not specified)",
        },
        includeHtml: {
          type: "boolean",
          description: "Include HTML structure (default: false, text only)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: [],
    },
  },
  {
    name: "ui_get_attribute",
    description: "Get an attribute value from an element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "Element selector",
        },
        attribute: {
          type: "string",
          description: "Attribute name to get",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: ["selector", "attribute"],
    },
  },
  {
    name: "ui_wait",
    description: "Wait for an element to appear or for a specified duration",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "Element to wait for",
        },
        timeout: {
          type: "number",
          description: "Maximum wait time in ms (default: 5000)",
        },
        state: {
          type: "string",
          enum: ["visible", "hidden", "attached", "detached"],
          description: "Element state to wait for (default: visible)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: [],
    },
  },
  {
    name: "ui_eval",
    description: "Execute JavaScript in the page context (browser) or equivalent script (mobile)",
    inputSchema: {
      type: "object" as const,
      properties: {
        script: {
          type: "string",
          description: "JavaScript code to execute",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: ["script"],
    },
  },
  {
    name: "ui_hover",
    description: "Hover over an element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector, XPath, or accessibility ID",
        },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_double_click",
    description: "Double-click on an element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector, XPath, or accessibility ID",
        },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_right_click",
    description: "Right-click (context menu) on an element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector, XPath, or accessibility ID",
        },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_keyboard",
    description: "Press a keyboard key or key combination",
    inputSchema: {
      type: "object" as const,
      properties: {
        key: {
          type: "string",
          description: "Key to press (e.g., 'Enter', 'Tab', 'Escape', 'a', 'ArrowDown')",
        },
        modifiers: {
          type: "array",
          items: { type: "string", enum: ["ctrl", "alt", "shift", "meta"] },
          description: "Modifier keys to hold (e.g., ['ctrl', 'shift'])",
        },
        selector: {
          type: "string",
          description: "Element to focus before pressing key (optional)",
        },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "ui_drag_drop",
    description: "Drag an element and drop it on another element",
    inputSchema: {
      type: "object" as const,
      properties: {
        sourceSelector: {
          type: "string",
          description: "Selector for the element to drag",
        },
        targetSelector: {
          type: "string",
          description: "Selector for the drop target",
        },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: ["sourceSelector", "targetSelector"],
    },
  },
  {
    name: "ui_highlight",
    description: "Highlight elements on the page for visual debugging",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "Element(s) to highlight (highlights all matches)",
        },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        color: {
          type: "string",
          description: "Highlight color (default: 'rgba(255, 0, 0, 0.3)')",
        },
        duration: {
          type: "number",
          description: "Duration in ms before removing highlight (default: 2000, 0 for permanent)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: [],
    },
  },
  {
    name: "ui_select",
    description: "Select option(s) from a dropdown/select element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "Selector for the select element",
        },
        value: {
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
          description: "Value(s) to select (use array for multi-select)",
        },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "ui_focus",
    description: "Focus on an element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector, XPath, or accessibility ID",
        },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_blur",
    description: "Remove focus from an element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: {
          type: "string",
          description: "CSS selector, XPath, or accessibility ID",
        },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: {
          type: "string",
          description: "Target executor ID (optional)",
        },
      },
      required: ["selector"],
    },
  },
  // ============================================================
  // Desktop-specific tools
  // ============================================================
  {
    name: "desktop_mouse_click",
    description: "Click at specific screen coordinates (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        x: { type: "number", description: "X coordinate" },
        y: { type: "number", description: "Y coordinate" },
        button: {
          type: "string",
          enum: ["left", "right", "middle"],
          description: "Mouse button (default: left)",
        },
        clicks: { type: "number", description: "Number of clicks (1 = single, 2 = double)" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "desktop_mouse_move",
    description: "Move mouse to specific screen coordinates (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        x: { type: "number", description: "X coordinate" },
        y: { type: "number", description: "Y coordinate" },
        duration: { type: "number", description: "Animation duration in ms" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "desktop_mouse_drag",
    description: "Drag mouse from one position to another (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        startX: { type: "number", description: "Start X coordinate" },
        startY: { type: "number", description: "Start Y coordinate" },
        endX: { type: "number", description: "End X coordinate" },
        endY: { type: "number", description: "End Y coordinate" },
        duration: { type: "number", description: "Drag duration in ms" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["startX", "startY", "endX", "endY"],
    },
  },
  {
    name: "desktop_window_list",
    description: "List all open windows (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        includeMinimized: { type: "boolean", description: "Include minimized windows" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  {
    name: "desktop_window_focus",
    description: "Focus/activate a window by title or process name (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Window title (partial match)" },
        processName: { type: "string", description: "Process name" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  {
    name: "desktop_window_state",
    description: "Change window state (minimize, maximize, restore, close)",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Window title" },
        processName: { type: "string", description: "Process name" },
        state: {
          type: "string",
          enum: ["minimize", "maximize", "restore", "close"],
          description: "New window state",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["state"],
    },
  },
  {
    name: "desktop_clipboard_read",
    description: "Read text from system clipboard (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        format: {
          type: "string",
          enum: ["text", "html", "image"],
          description: "Clipboard format (default: text)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  {
    name: "desktop_clipboard_write",
    description: "Write text to system clipboard (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "Text to write to clipboard" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["text"],
    },
  },
  {
    name: "desktop_shell_exec",
    description: "Execute a shell command (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        command: { type: "string", description: "Command to execute" },
        cwd: { type: "string", description: "Working directory" },
        timeout: { type: "number", description: "Timeout in ms (default: 30000)" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["command"],
    },
  },
  {
    name: "desktop_app_launch",
    description: "Launch an application (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Path to application or executable" },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Command line arguments",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["path"],
    },
  },
  {
    name: "desktop_app_close",
    description: "Close an application by process name or PID (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        processName: { type: "string", description: "Process name to close" },
        pid: { type: "number", description: "Process ID to close" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  {
    name: "desktop_file_read",
    description: "Read file contents (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path" },
        encoding: { type: "string", description: "File encoding (default: utf8)" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["path"],
    },
  },
  {
    name: "desktop_file_write",
    description: "Write content to a file (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path" },
        content: { type: "string", description: "Content to write" },
        encoding: { type: "string", description: "File encoding (default: utf8)" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "desktop_file_exists",
    description: "Check if a file exists (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path to check" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["path"],
    },
  },
  {
    name: "desktop_notify",
    description: "Show a desktop notification (desktop only)",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Notification title" },
        message: { type: "string", description: "Notification message" },
        icon: { type: "string", description: "Icon path (optional)" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["title", "message"],
    },
  },
];

// Tool handlers
async function handleToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "executor_list": {
      const executors = executorManager.list();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(executors, null, 2),
          },
        ],
      };
    }

    case "executor_use": {
      const executorId = args.executorId as string;
      const success = executorManager.setDefault(executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: success
              ? `Default executor set to: ${executorId}`
              : `Executor not found: ${executorId}`,
          },
        ],
      };
    }

    case "ui_navigate": {
      const { url, executorId } = args as { url: string; executorId?: string };
      const result = await executorManager.execute("navigate", { url }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Navigated to: ${url}`
              : `Failed to navigate: ${result.error}`,
          },
        ],
      };
    }

    case "ui_click": {
      const { selector, selectorType, executorId } = args as {
        selector: string;
        selectorType?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "click",
        { selector, selectorType: selectorType || "css" },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Clicked: ${selector}`
              : `Failed to click: ${result.error}`,
          },
        ],
      };
    }

    case "ui_type": {
      const { selector, text, selectorType, clearFirst, executorId } = args as {
        selector: string;
        text: string;
        selectorType?: string;
        clearFirst?: boolean;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "type",
        {
          selector,
          text,
          selectorType: selectorType || "css",
          clearFirst: clearFirst || false,
        },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Typed "${text}" into: ${selector}`
              : `Failed to type: ${result.error}`,
          },
        ],
      };
    }

    case "ui_scroll": {
      const { direction, amount, selector, executorId } = args as {
        direction: string;
        amount?: number;
        selector?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "scroll",
        { direction, amount: amount || 300, selector },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Scrolled ${direction}${selector ? ` in ${selector}` : ""}`
              : `Failed to scroll: ${result.error}`,
          },
        ],
      };
    }

    case "ui_screenshot": {
      const { selector, fullPage, executorId } = args as {
        selector?: string;
        fullPage?: boolean;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "screenshot",
        { selector, fullPage: fullPage || false },
        executorId
      );
      if (result.success && result.data) {
        return {
          content: [
            {
              type: "image" as const,
              data: result.data as string,
              mimeType: "image/png",
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to take screenshot: ${result.error}`,
          },
        ],
      };
    }

    case "ui_get_content": {
      const { selector, includeHtml, executorId } = args as {
        selector?: string;
        includeHtml?: boolean;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "getContent",
        { selector, includeHtml: includeHtml || false },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? (result.data as string)
              : `Failed to get content: ${result.error}`,
          },
        ],
      };
    }

    case "ui_get_attribute": {
      const { selector, attribute, executorId } = args as {
        selector: string;
        attribute: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "getAttribute",
        { selector, attribute },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `${attribute}="${result.data}"`
              : `Failed to get attribute: ${result.error}`,
          },
        ],
      };
    }

    case "ui_wait": {
      const { selector, timeout, state, executorId } = args as {
        selector?: string;
        timeout?: number;
        state?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "wait",
        { selector, timeout: timeout || 5000, state: state || "visible" },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? selector
                ? `Element found: ${selector}`
                : `Waited ${timeout || 5000}ms`
              : `Wait failed: ${result.error}`,
          },
        ],
      };
    }

    case "ui_eval": {
      const { script, executorId } = args as {
        script: string;
        executorId?: string;
      };
      const result = await executorManager.execute("eval", { script }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Result: ${JSON.stringify(result.data)}`
              : `Eval failed: ${result.error}`,
          },
        ],
      };
    }

    case "ui_hover": {
      const { selector, selectorType, executorId } = args as {
        selector: string;
        selectorType?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "hover",
        { selector, selectorType: selectorType || "css" },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Hovered: ${selector}`
              : `Failed to hover: ${result.error}`,
          },
        ],
      };
    }

    case "ui_double_click": {
      const { selector, selectorType, executorId } = args as {
        selector: string;
        selectorType?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "doubleClick",
        { selector, selectorType: selectorType || "css" },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Double-clicked: ${selector}`
              : `Failed to double-click: ${result.error}`,
          },
        ],
      };
    }

    case "ui_right_click": {
      const { selector, selectorType, executorId } = args as {
        selector: string;
        selectorType?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "rightClick",
        { selector, selectorType: selectorType || "css" },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Right-clicked: ${selector}`
              : `Failed to right-click: ${result.error}`,
          },
        ],
      };
    }

    case "ui_keyboard": {
      const { key, modifiers, selector, selectorType, executorId } = args as {
        key: string;
        modifiers?: string[];
        selector?: string;
        selectorType?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "keyboard",
        { key, modifiers: modifiers || [], selector, selectorType: selectorType || "css" },
        executorId
      );
      const keyCombo = modifiers?.length
        ? `${modifiers.join("+")}+${key}`
        : key;
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Pressed: ${keyCombo}`
              : `Failed to press key: ${result.error}`,
          },
        ],
      };
    }

    case "ui_drag_drop": {
      const { sourceSelector, targetSelector, selectorType, executorId } = args as {
        sourceSelector: string;
        targetSelector: string;
        selectorType?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "dragDrop",
        { sourceSelector, targetSelector, selectorType: selectorType || "css" },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Dragged ${sourceSelector} to ${targetSelector}`
              : `Failed to drag-drop: ${result.error}`,
          },
        ],
      };
    }

    case "ui_highlight": {
      const { selector, selectorType, color, duration, executorId } = args as {
        selector?: string;
        selectorType?: string;
        color?: string;
        duration?: number;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "highlight",
        {
          selector,
          selectorType: selectorType || "css",
          color: color || "rgba(255, 0, 0, 0.3)",
          duration: duration ?? 2000,
        },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? selector
                ? `Highlighted: ${selector}`
                : "Cleared all highlights"
              : `Failed to highlight: ${result.error}`,
          },
        ],
      };
    }

    case "ui_select": {
      const { selector, value, selectorType, executorId } = args as {
        selector: string;
        value: string | string[];
        selectorType?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "select",
        { selector, value, selectorType: selectorType || "css" },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Selected ${JSON.stringify(value)} in ${selector}`
              : `Failed to select: ${result.error}`,
          },
        ],
      };
    }

    case "ui_focus": {
      const { selector, selectorType, executorId } = args as {
        selector: string;
        selectorType?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "focus",
        { selector, selectorType: selectorType || "css" },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Focused: ${selector}`
              : `Failed to focus: ${result.error}`,
          },
        ],
      };
    }

    case "ui_blur": {
      const { selector, selectorType, executorId } = args as {
        selector: string;
        selectorType?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "blur",
        { selector, selectorType: selectorType || "css" },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Blurred: ${selector}`
              : `Failed to blur: ${result.error}`,
          },
        ],
      };
    }

    // ============================================================
    // Desktop-specific tool handlers
    // ============================================================
    case "desktop_mouse_click": {
      const { x, y, button, clicks, executorId } = args as {
        x: number;
        y: number;
        button?: string;
        clicks?: number;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "mouseClick",
        { x, y, button: button || "left", clicks: clicks || 1 },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Clicked at (${x}, ${y})`
              : `Failed to click: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_mouse_move": {
      const { x, y, duration, executorId } = args as {
        x: number;
        y: number;
        duration?: number;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "mouseMove",
        { x, y, duration: duration || 0 },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Moved mouse to (${x}, ${y})`
              : `Failed to move: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_mouse_drag": {
      const { startX, startY, endX, endY, duration, executorId } = args as {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        duration?: number;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "mouseDrag",
        { startX, startY, endX, endY, duration: duration || 500 },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Dragged from (${startX}, ${startY}) to (${endX}, ${endY})`
              : `Failed to drag: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_window_list": {
      const { includeMinimized, executorId } = args as {
        includeMinimized?: boolean;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "windowList",
        { includeMinimized: includeMinimized || false },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? JSON.stringify(result.data, null, 2)
              : `Failed to list windows: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_window_focus": {
      const { title, processName, executorId } = args as {
        title?: string;
        processName?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "windowFocus",
        { title, processName },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Focused window: ${title || processName}`
              : `Failed to focus: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_window_state": {
      const { title, processName, state, executorId } = args as {
        title?: string;
        processName?: string;
        state: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "windowState",
        { title, processName, state },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Window state changed to: ${state}`
              : `Failed to change state: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_clipboard_read": {
      const { format, executorId } = args as {
        format?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "clipboardRead",
        { format: format || "text" },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? String(result.data)
              : `Failed to read clipboard: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_clipboard_write": {
      const { text, executorId } = args as {
        text: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "clipboardWrite",
        { text },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? "Copied to clipboard"
              : `Failed to write clipboard: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_shell_exec": {
      const { command, cwd, timeout, executorId } = args as {
        command: string;
        cwd?: string;
        timeout?: number;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "shellExec",
        { command, cwd, timeout: timeout || 30000 },
        executorId
      );
      if (result.success) {
        const data = result.data as { stdout: string; stderr: string };
        return {
          content: [
            {
              type: "text" as const,
              text: data.stdout || data.stderr || "(no output)",
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: `Command failed: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_app_launch": {
      const { path, args: appArgs, executorId } = args as {
        path: string;
        args?: string[];
        executorId?: string;
      };
      const result = await executorManager.execute(
        "appLaunch",
        { path, args: appArgs || [] },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Launched: ${path}`
              : `Failed to launch: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_app_close": {
      const { processName, pid, executorId } = args as {
        processName?: string;
        pid?: number;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "appClose",
        { processName, pid },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Closed: ${processName || pid}`
              : `Failed to close: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_file_read": {
      const { path, encoding, executorId } = args as {
        path: string;
        encoding?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "fileRead",
        { path, encoding: encoding || "utf8" },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? String(result.data)
              : `Failed to read file: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_file_write": {
      const { path, content, encoding, executorId } = args as {
        path: string;
        content: string;
        encoding?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "fileWrite",
        { path, content, encoding: encoding || "utf8" },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Written to: ${path}`
              : `Failed to write file: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_file_exists": {
      const { path, executorId } = args as {
        path: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "fileExists",
        { path },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `File exists: ${result.data}`
              : `Failed to check file: ${result.error}`,
          },
        ],
      };
    }

    case "desktop_notify": {
      const { title, message, icon, executorId } = args as {
        title: string;
        message: string;
        icon?: string;
        executorId?: string;
      };
      const result = await executorManager.execute(
        "notify",
        { title, message, icon },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? "Notification sent"
              : `Failed to notify: ${result.error}`,
          },
        ],
      };
    }

    default:
      return {
        content: [
          {
            type: "text" as const,
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
  }
}

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: "wire-agent",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    log.debug(`Listing ${tools.length} tools`);
    return { tools };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    log.info(`Tool call: ${name}`, args);
    const result = await handleToolCall(name, args || {});
    log.debug(`Tool result: ${name}`, { isError: "isError" in result && result.isError });
    return result;
  });

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("Server started on stdio");
}
