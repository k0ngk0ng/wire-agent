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
  // Browser-specific extended tools
  // ============================================================
  // Tab Management
  {
    name: "ui_tab_list",
    description: "List all open browser tabs",
    inputSchema: {
      type: "object" as const,
      properties: {
        windowId: { type: "number", description: "Filter by window ID (optional)" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  {
    name: "ui_tab_create",
    description: "Create a new browser tab",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "URL to open (default: about:blank)" },
        active: { type: "boolean", description: "Make the new tab active (default: true)" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  {
    name: "ui_tab_close",
    description: "Close a browser tab",
    inputSchema: {
      type: "object" as const,
      properties: {
        tabId: { type: "number", description: "Tab ID to close (uses current if not specified)" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  {
    name: "ui_tab_activate",
    description: "Activate/focus a specific tab",
    inputSchema: {
      type: "object" as const,
      properties: {
        tabId: { type: "number", description: "Tab ID to activate" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["tabId"],
    },
  },
  {
    name: "ui_tab_reload",
    description: "Reload a browser tab",
    inputSchema: {
      type: "object" as const,
      properties: {
        tabId: { type: "number", description: "Tab ID to reload (uses current if not specified)" },
        bypassCache: { type: "boolean", description: "Bypass cache (default: false)" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  {
    name: "ui_tab_duplicate",
    description: "Duplicate a browser tab",
    inputSchema: {
      type: "object" as const,
      properties: {
        tabId: { type: "number", description: "Tab ID to duplicate (uses current if not specified)" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  // Navigation
  {
    name: "ui_go_back",
    description: "Navigate back in browser history",
    inputSchema: {
      type: "object" as const,
      properties: {
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  {
    name: "ui_go_forward",
    description: "Navigate forward in browser history",
    inputSchema: {
      type: "object" as const,
      properties: {
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  {
    name: "ui_get_url",
    description: "Get the current page URL",
    inputSchema: {
      type: "object" as const,
      properties: {
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  {
    name: "ui_get_title",
    description: "Get the current page title",
    inputSchema: {
      type: "object" as const,
      properties: {
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  // Storage
  {
    name: "ui_storage_get",
    description: "Get a value from localStorage or sessionStorage",
    inputSchema: {
      type: "object" as const,
      properties: {
        key: { type: "string", description: "Storage key" },
        storageType: {
          type: "string",
          enum: ["local", "session"],
          description: "Storage type (default: local)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["key"],
    },
  },
  {
    name: "ui_storage_set",
    description: "Set a value in localStorage or sessionStorage",
    inputSchema: {
      type: "object" as const,
      properties: {
        key: { type: "string", description: "Storage key" },
        value: { type: "string", description: "Value to store" },
        storageType: {
          type: "string",
          enum: ["local", "session"],
          description: "Storage type (default: local)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "ui_storage_clear",
    description: "Clear localStorage or sessionStorage",
    inputSchema: {
      type: "object" as const,
      properties: {
        storageType: {
          type: "string",
          enum: ["local", "session"],
          description: "Storage type (default: local)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  // Cookies
  {
    name: "ui_cookie_get",
    description: "Get a specific cookie by name",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Cookie name" },
        url: { type: "string", description: "URL context (uses current page if not specified)" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["name"],
    },
  },
  {
    name: "ui_cookie_set",
    description: "Set a cookie",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Cookie name" },
        value: { type: "string", description: "Cookie value" },
        url: { type: "string", description: "URL context" },
        domain: { type: "string", description: "Cookie domain" },
        path: { type: "string", description: "Cookie path" },
        secure: { type: "boolean", description: "Secure cookie" },
        httpOnly: { type: "boolean", description: "HTTP only cookie" },
        expirationDate: { type: "number", description: "Expiration timestamp" },
        sameSite: {
          type: "string",
          enum: ["no_restriction", "lax", "strict"],
          description: "SameSite attribute",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["name", "value"],
    },
  },
  {
    name: "ui_cookie_delete",
    description: "Delete a cookie",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Cookie name" },
        url: { type: "string", description: "URL context (uses current page if not specified)" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["name"],
    },
  },
  {
    name: "ui_cookie_get_all",
    description: "Get all cookies for a URL or domain",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "URL to get cookies for" },
        domain: { type: "string", description: "Domain to get cookies for" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  // Forms
  {
    name: "ui_form_submit",
    description: "Submit a form",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Form selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_form_reset",
    description: "Reset a form to its initial values",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Form selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_checkbox",
    description: "Set checkbox or radio button state",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Checkbox/radio selector" },
        checked: { type: "boolean", description: "Checked state" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector", "checked"],
    },
  },
  // Element queries
  {
    name: "ui_query_selector",
    description: "Find a single element and return basic info",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_query_selector_all",
    description: "Find all matching elements and return their info",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        limit: { type: "number", description: "Maximum number of elements to return (default: 100)" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_get_element_info",
    description: "Get detailed information about an element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_get_bounding_rect",
    description: "Get element bounding rectangle (position and size)",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_is_visible",
    description: "Check if an element is visible",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_is_enabled",
    description: "Check if an element is enabled (not disabled)",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_element_exists",
    description: "Check if an element exists in the DOM",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_count_elements",
    description: "Count matching elements",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  // Frame operations
  {
    name: "ui_get_frames",
    description: "Get all iframes/frames on the page",
    inputSchema: {
      type: "object" as const,
      properties: {
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  // Text operations
  {
    name: "ui_select_text",
    description: "Select text within an element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element selector" },
        start: { type: "number", description: "Start position (optional)" },
        end: { type: "number", description: "End position (optional)" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_copy_text",
    description: "Copy text to clipboard (from element or selection)",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element to copy from (copies selection if not specified)" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  {
    name: "ui_get_text",
    description: "Get text content of an element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  // Media control
  {
    name: "ui_media_play",
    description: "Play a video or audio element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Media element selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_media_pause",
    description: "Pause a video or audio element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Media element selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_media_set_volume",
    description: "Set volume of a media element (0-1)",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Media element selector" },
        volume: { type: "number", description: "Volume level (0-1)" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector", "volume"],
    },
  },
  {
    name: "ui_media_get_state",
    description: "Get current state of a media element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Media element selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  // Position-based operations
  {
    name: "ui_click_at_position",
    description: "Click at specific x,y coordinates on the page",
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
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "ui_hover_at_position",
    description: "Hover at specific x,y coordinates on the page",
    inputSchema: {
      type: "object" as const,
      properties: {
        x: { type: "number", description: "X coordinate" },
        y: { type: "number", description: "Y coordinate" },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["x", "y"],
    },
  },
  // Element state
  {
    name: "ui_scroll_into_view",
    description: "Scroll an element into the visible area",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element selector" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        behavior: {
          type: "string",
          enum: ["auto", "smooth"],
          description: "Scroll behavior (default: smooth)",
        },
        block: {
          type: "string",
          enum: ["start", "center", "end", "nearest"],
          description: "Vertical alignment (default: center)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_get_computed_style",
    description: "Get computed CSS styles of an element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element selector" },
        property: { type: "string", description: "Specific CSS property (returns common styles if not specified)" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["selector"],
    },
  },
  {
    name: "ui_get_scroll_position",
    description: "Get scroll position of page or element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Element selector (page scroll if not specified)" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  {
    name: "ui_set_scroll_position",
    description: "Set scroll position of page or element",
    inputSchema: {
      type: "object" as const,
      properties: {
        x: { type: "number", description: "Horizontal scroll position" },
        y: { type: "number", description: "Vertical scroll position" },
        selector: { type: "string", description: "Element selector (page scroll if not specified)" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        behavior: {
          type: "string",
          enum: ["auto", "smooth"],
          description: "Scroll behavior (default: auto)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: ["x", "y"],
    },
  },
  // Performance
  {
    name: "ui_get_performance",
    description: "Get page performance metrics",
    inputSchema: {
      type: "object" as const,
      properties: {
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  // Window info
  {
    name: "ui_get_window_info",
    description: "Get browser window information",
    inputSchema: {
      type: "object" as const,
      properties: {
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
    },
  },
  // Accessibility
  {
    name: "ui_get_accessibility_tree",
    description: "Get accessibility tree of the page or an element",
    inputSchema: {
      type: "object" as const,
      properties: {
        selector: { type: "string", description: "Root element (whole page if not specified)" },
        selectorType: {
          type: "string",
          enum: ["css", "xpath", "accessibility", "text"],
          description: "Type of selector (default: css)",
        },
        executorId: { type: "string", description: "Target executor ID (optional)" },
      },
      required: [],
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
    // Browser-specific extended tool handlers
    // ============================================================

    // Tab Management
    case "ui_tab_list": {
      const { windowId, executorId } = args as { windowId?: number; executorId?: string };
      const result = await executorManager.execute("tabList", { windowId }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? JSON.stringify(result.data, null, 2)
              : `Failed to list tabs: ${result.error}`,
          },
        ],
      };
    }

    case "ui_tab_create": {
      const { url, active, executorId } = args as { url?: string; active?: boolean; executorId?: string };
      const result = await executorManager.execute("tabCreate", { url, active }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Created tab: ${JSON.stringify(result.data)}`
              : `Failed to create tab: ${result.error}`,
          },
        ],
      };
    }

    case "ui_tab_close": {
      const { tabId, executorId } = args as { tabId?: number; executorId?: string };
      const result = await executorManager.execute("tabClose", { tabId }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? "Tab closed" : `Failed to close tab: ${result.error}`,
          },
        ],
      };
    }

    case "ui_tab_activate": {
      const { tabId, executorId } = args as { tabId: number; executorId?: string };
      const result = await executorManager.execute("tabActivate", { tabId }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Activated tab ${tabId}` : `Failed to activate tab: ${result.error}`,
          },
        ],
      };
    }

    case "ui_tab_reload": {
      const { tabId, bypassCache, executorId } = args as { tabId?: number; bypassCache?: boolean; executorId?: string };
      const result = await executorManager.execute("tabReload", { tabId, bypassCache }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? "Tab reloaded" : `Failed to reload tab: ${result.error}`,
          },
        ],
      };
    }

    case "ui_tab_duplicate": {
      const { tabId, executorId } = args as { tabId?: number; executorId?: string };
      const result = await executorManager.execute("tabDuplicate", { tabId }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? `Duplicated tab: ${JSON.stringify(result.data)}`
              : `Failed to duplicate tab: ${result.error}`,
          },
        ],
      };
    }

    // Navigation
    case "ui_go_back": {
      const { executorId } = args as { executorId?: string };
      const result = await executorManager.execute("goBack", {}, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? "Navigated back" : `Failed to go back: ${result.error}`,
          },
        ],
      };
    }

    case "ui_go_forward": {
      const { executorId } = args as { executorId?: string };
      const result = await executorManager.execute("goForward", {}, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? "Navigated forward" : `Failed to go forward: ${result.error}`,
          },
        ],
      };
    }

    case "ui_get_url": {
      const { executorId } = args as { executorId?: string };
      const result = await executorManager.execute("getUrl", {}, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? String(result.data) : `Failed to get URL: ${result.error}`,
          },
        ],
      };
    }

    case "ui_get_title": {
      const { executorId } = args as { executorId?: string };
      const result = await executorManager.execute("getTitle", {}, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? String(result.data) : `Failed to get title: ${result.error}`,
          },
        ],
      };
    }

    // Storage
    case "ui_storage_get": {
      const { key, storageType, executorId } = args as { key: string; storageType?: string; executorId?: string };
      const result = await executorManager.execute("storageGet", { key, storageType }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success
              ? result.data !== null ? String(result.data) : "(null)"
              : `Failed to get storage: ${result.error}`,
          },
        ],
      };
    }

    case "ui_storage_set": {
      const { key, value, storageType, executorId } = args as { key: string; value: string; storageType?: string; executorId?: string };
      const result = await executorManager.execute("storageSet", { key, value, storageType }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Set ${key} in ${storageType || "local"}Storage` : `Failed to set storage: ${result.error}`,
          },
        ],
      };
    }

    case "ui_storage_clear": {
      const { storageType, executorId } = args as { storageType?: string; executorId?: string };
      const result = await executorManager.execute("storageClear", { storageType }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Cleared ${storageType || "local"}Storage` : `Failed to clear storage: ${result.error}`,
          },
        ],
      };
    }

    // Cookies
    case "ui_cookie_get": {
      const { name, url, executorId } = args as { name: string; url?: string; executorId?: string };
      const result = await executorManager.execute("cookieGet", { name, url }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? JSON.stringify(result.data, null, 2) : `Failed to get cookie: ${result.error}`,
          },
        ],
      };
    }

    case "ui_cookie_set": {
      const { name, value, url, domain, path, secure, httpOnly, expirationDate, sameSite, executorId } = args as {
        name: string; value: string; url?: string; domain?: string; path?: string;
        secure?: boolean; httpOnly?: boolean; expirationDate?: number; sameSite?: string; executorId?: string;
      };
      const result = await executorManager.execute(
        "cookieSet",
        { name, value, url, domain, path, secure, httpOnly, expirationDate, sameSite },
        executorId
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Set cookie: ${name}` : `Failed to set cookie: ${result.error}`,
          },
        ],
      };
    }

    case "ui_cookie_delete": {
      const { name, url, executorId } = args as { name: string; url?: string; executorId?: string };
      const result = await executorManager.execute("cookieDelete", { name, url }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Deleted cookie: ${name}` : `Failed to delete cookie: ${result.error}`,
          },
        ],
      };
    }

    case "ui_cookie_get_all": {
      const { url, domain, executorId } = args as { url?: string; domain?: string; executorId?: string };
      const result = await executorManager.execute("cookieGetAll", { url, domain }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? JSON.stringify(result.data, null, 2) : `Failed to get cookies: ${result.error}`,
          },
        ],
      };
    }

    // Forms
    case "ui_form_submit": {
      const { selector, selectorType, executorId } = args as { selector: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("formSubmit", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Submitted form: ${selector}` : `Failed to submit form: ${result.error}`,
          },
        ],
      };
    }

    case "ui_form_reset": {
      const { selector, selectorType, executorId } = args as { selector: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("formReset", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Reset form: ${selector}` : `Failed to reset form: ${result.error}`,
          },
        ],
      };
    }

    case "ui_checkbox": {
      const { selector, checked, selectorType, executorId } = args as { selector: string; checked: boolean; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("checkbox", { selector, checked, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Set checkbox ${selector} to ${checked}` : `Failed to set checkbox: ${result.error}`,
          },
        ],
      };
    }

    // Element queries
    case "ui_query_selector": {
      const { selector, selectorType, executorId } = args as { selector: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("querySelector", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? JSON.stringify(result.data, null, 2) : `Failed to query: ${result.error}`,
          },
        ],
      };
    }

    case "ui_query_selector_all": {
      const { selector, selectorType, limit, executorId } = args as { selector: string; selectorType?: string; limit?: number; executorId?: string };
      const result = await executorManager.execute("querySelectorAll", { selector, selectorType: selectorType || "css", limit }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? JSON.stringify(result.data, null, 2) : `Failed to query: ${result.error}`,
          },
        ],
      };
    }

    case "ui_get_element_info": {
      const { selector, selectorType, executorId } = args as { selector: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("getElementInfo", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? JSON.stringify(result.data, null, 2) : `Failed to get element info: ${result.error}`,
          },
        ],
      };
    }

    case "ui_get_bounding_rect": {
      const { selector, selectorType, executorId } = args as { selector: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("getBoundingRect", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? JSON.stringify(result.data, null, 2) : `Failed to get bounding rect: ${result.error}`,
          },
        ],
      };
    }

    case "ui_is_visible": {
      const { selector, selectorType, executorId } = args as { selector: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("isVisible", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `visible: ${result.data}` : `Failed to check visibility: ${result.error}`,
          },
        ],
      };
    }

    case "ui_is_enabled": {
      const { selector, selectorType, executorId } = args as { selector: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("isEnabled", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `enabled: ${result.data}` : `Failed to check enabled: ${result.error}`,
          },
        ],
      };
    }

    case "ui_element_exists": {
      const { selector, selectorType, executorId } = args as { selector: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("elementExists", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `exists: ${result.data}` : `Failed to check existence: ${result.error}`,
          },
        ],
      };
    }

    case "ui_count_elements": {
      const { selector, selectorType, executorId } = args as { selector: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("countElements", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `count: ${result.data}` : `Failed to count elements: ${result.error}`,
          },
        ],
      };
    }

    // Frame operations
    case "ui_get_frames": {
      const { executorId } = args as { executorId?: string };
      const result = await executorManager.execute("getFrames", {}, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? JSON.stringify(result.data, null, 2) : `Failed to get frames: ${result.error}`,
          },
        ],
      };
    }

    // Text operations
    case "ui_select_text": {
      const { selector, start, end, selectorType, executorId } = args as { selector: string; start?: number; end?: number; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("selectText", { selector, start, end, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Selected text in: ${selector}` : `Failed to select text: ${result.error}`,
          },
        ],
      };
    }

    case "ui_copy_text": {
      const { selector, selectorType, executorId } = args as { selector?: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("copyText", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Copied: ${result.data}` : `Failed to copy text: ${result.error}`,
          },
        ],
      };
    }

    case "ui_get_text": {
      const { selector, selectorType, executorId } = args as { selector: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("getText", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? String(result.data) : `Failed to get text: ${result.error}`,
          },
        ],
      };
    }

    // Media control
    case "ui_media_play": {
      const { selector, selectorType, executorId } = args as { selector: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("mediaPlay", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Playing: ${selector}` : `Failed to play: ${result.error}`,
          },
        ],
      };
    }

    case "ui_media_pause": {
      const { selector, selectorType, executorId } = args as { selector: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("mediaPause", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Paused: ${selector}` : `Failed to pause: ${result.error}`,
          },
        ],
      };
    }

    case "ui_media_set_volume": {
      const { selector, volume, selectorType, executorId } = args as { selector: string; volume: number; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("mediaSetVolume", { selector, volume, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Set volume to ${volume}` : `Failed to set volume: ${result.error}`,
          },
        ],
      };
    }

    case "ui_media_get_state": {
      const { selector, selectorType, executorId } = args as { selector: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("mediaGetState", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? JSON.stringify(result.data, null, 2) : `Failed to get media state: ${result.error}`,
          },
        ],
      };
    }

    // Position-based operations
    case "ui_click_at_position": {
      const { x, y, button, executorId } = args as { x: number; y: number; button?: string; executorId?: string };
      const result = await executorManager.execute("clickAtPosition", { x, y, button: button || "left" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Clicked at (${x}, ${y})` : `Failed to click: ${result.error}`,
          },
        ],
      };
    }

    case "ui_hover_at_position": {
      const { x, y, executorId } = args as { x: number; y: number; executorId?: string };
      const result = await executorManager.execute("hoverAtPosition", { x, y }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Hovered at (${x}, ${y})` : `Failed to hover: ${result.error}`,
          },
        ],
      };
    }

    // Element state
    case "ui_scroll_into_view": {
      const { selector, selectorType, behavior, block, executorId } = args as { selector: string; selectorType?: string; behavior?: string; block?: string; executorId?: string };
      const result = await executorManager.execute("scrollIntoView", { selector, selectorType: selectorType || "css", behavior, block }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Scrolled into view: ${selector}` : `Failed to scroll: ${result.error}`,
          },
        ],
      };
    }

    case "ui_get_computed_style": {
      const { selector, property, selectorType, executorId } = args as { selector: string; property?: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("getComputedStyle", { selector, property, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? JSON.stringify(result.data, null, 2) : `Failed to get style: ${result.error}`,
          },
        ],
      };
    }

    case "ui_get_scroll_position": {
      const { selector, selectorType, executorId } = args as { selector?: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("getScrollPosition", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? JSON.stringify(result.data, null, 2) : `Failed to get scroll position: ${result.error}`,
          },
        ],
      };
    }

    case "ui_set_scroll_position": {
      const { x, y, selector, selectorType, behavior, executorId } = args as { x: number; y: number; selector?: string; selectorType?: string; behavior?: string; executorId?: string };
      const result = await executorManager.execute("setScrollPosition", { x, y, selector, selectorType: selectorType || "css", behavior }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? `Scrolled to (${x}, ${y})` : `Failed to set scroll position: ${result.error}`,
          },
        ],
      };
    }

    // Performance
    case "ui_get_performance": {
      const { executorId } = args as { executorId?: string };
      const result = await executorManager.execute("getPerformance", {}, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? JSON.stringify(result.data, null, 2) : `Failed to get performance: ${result.error}`,
          },
        ],
      };
    }

    // Window info
    case "ui_get_window_info": {
      const { executorId } = args as { executorId?: string };
      const result = await executorManager.execute("getWindowInfo", {}, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? JSON.stringify(result.data, null, 2) : `Failed to get window info: ${result.error}`,
          },
        ],
      };
    }

    // Accessibility
    case "ui_get_accessibility_tree": {
      const { selector, selectorType, executorId } = args as { selector?: string; selectorType?: string; executorId?: string };
      const result = await executorManager.execute("getAccessibilityTree", { selector, selectorType: selectorType || "css" }, executorId);
      return {
        content: [
          {
            type: "text" as const,
            text: result.success ? JSON.stringify(result.data, null, 2) : `Failed to get accessibility tree: ${result.error}`,
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
