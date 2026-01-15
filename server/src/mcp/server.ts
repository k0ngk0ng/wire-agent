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
