// Wire Agent - Browser Executor Background Script
// Connects to Wire Agent Server via WebSocket and routes commands to content scripts

const WS_URL = "ws://localhost:3888";
const RECONNECT_INTERVAL = 5000; // 5 seconds between retries
const MAX_RECONNECT_INTERVAL = 30000; // Max 30 seconds

let ws = null;
let isConnected = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
let hasLoggedDisconnect = false;

// Generate executor ID based on extension ID
function getExecutorId(tabId) {
  return `browser:tab:${tabId}`;
}

// ============================================================
// WebSocket Connection
// ============================================================

function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  // Only log first attempt or after successful connection
  if (reconnectAttempts === 0) {
    console.log("[WireAgent] Connecting to server...");
  }

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("[WireAgent] Connected to server");
      isConnected = true;
      reconnectAttempts = 0;
      hasLoggedDisconnect = false;
      broadcastStatus(true);

      // Register the browser extension as a single executor
      registerBrowserExecutor();
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("[WireAgent] Received:", message.type, message.action || "");
        await handleServerMessage(message);
      } catch (err) {
        console.warn("[WireAgent] Message handling error:", err);
      }
    };

    ws.onclose = () => {
      if (!hasLoggedDisconnect && isConnected) {
        console.log("[WireAgent] Disconnected from server");
        hasLoggedDisconnect = true;
      }
      isConnected = false;
      ws = null;
      broadcastStatus(false);
      scheduleReconnect();
    };

    ws.onerror = () => {
      // Silent - Chrome will log the error anyway, we just handle reconnect
    };
  } catch (err) {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  // Exponential backoff: 5s, 10s, 20s, 30s (max)
  const delay = Math.min(
    RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts),
    MAX_RECONNECT_INTERVAL
  );
  reconnectAttempts++;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

function send(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("[WireAgent] Sending:", message.type);
    ws.send(JSON.stringify(message));
  } else {
    console.warn("[WireAgent] Cannot send, ws not open:", ws?.readyState);
  }
}

// ============================================================
// Tab Registration
// ============================================================

// Register the browser extension as a single executor
function registerBrowserExecutor() {
  console.log("[WireAgent] Registering browser executor");
  send({
    type: "register",
    executorId: "browser",
    platform: "browser",
    capabilities: [
      // Basic interaction
      "navigate",
      "click",
      "doubleClick",
      "rightClick",
      "hover",
      "type",
      "scroll",
      "screenshot",
      "eval",
      "wait",
      "getContent",
      "getAttribute",
      "keyboard",
      "dragDrop",
      "highlight",
      "select",
      "focus",
      "blur",
      // Tab management
      "tabList",
      "tabCreate",
      "tabClose",
      "tabActivate",
      "tabReload",
      "tabDuplicate",
      // Navigation
      "goBack",
      "goForward",
      "getUrl",
      "getTitle",
      // Storage & Cookies
      "storageGet",
      "storageSet",
      "storageClear",
      "cookieGet",
      "cookieSet",
      "cookieDelete",
      "cookieGetAll",
      // Forms
      "formSubmit",
      "formReset",
      "checkbox",
      // Element queries
      "querySelector",
      "querySelectorAll",
      "getElementInfo",
      "getBoundingRect",
      "isVisible",
      "isEnabled",
      "elementExists",
      "countElements",
      // Frame operations
      "getFrames",
      // Text operations
      "selectText",
      "copyText",
      "getText",
      // Media control
      "mediaPlay",
      "mediaPause",
      "mediaSetVolume",
      "mediaGetState",
      // Position-based actions
      "clickAtPosition",
      "hoverAtPosition",
      // Element state
      "scrollIntoView",
      "getComputedStyle",
      "getScrollPosition",
      "setScrollPosition",
      // Performance & Debug
      "getPerformance",
      "getWindowInfo",
      "getAccessibilityTree",
    ],
    meta: {
      userAgent: navigator.userAgent,
    },
  });
}

async function registerAllTabs() {
  const tabs = await chrome.tabs.query({});
  console.log("[WireAgent] Registering", tabs.length, "tabs");
  for (const tab of tabs) {
    console.log("[WireAgent] Tab:", tab.id, tab.url);
    if (tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://")) {
      registerTab(tab);
    } else {
      console.log("[WireAgent] Skipped tab (chrome:// or no url)");
    }
  }
}

function registerTab(tab) {
  console.log("[WireAgent] Registering tab:", tab.id, tab.url);
  send({
    type: "register",
    executorId: getExecutorId(tab.id),
    platform: "browser",
    capabilities: [
      // Basic interaction
      "navigate",
      "click",
      "doubleClick",
      "rightClick",
      "hover",
      "type",
      "scroll",
      "screenshot",
      "eval",
      "wait",
      "getContent",
      "getAttribute",
      "keyboard",
      "dragDrop",
      "highlight",
      "select",
      "focus",
      "blur",
      // Tab management
      "tabList",
      "tabCreate",
      "tabClose",
      "tabActivate",
      "tabReload",
      "tabDuplicate",
      // Navigation
      "goBack",
      "goForward",
      "getUrl",
      "getTitle",
      // Storage & Cookies
      "storageGet",
      "storageSet",
      "storageClear",
      "cookieGet",
      "cookieSet",
      "cookieDelete",
      "cookieGetAll",
      // Forms
      "formSubmit",
      "formReset",
      "checkbox",
      // Element queries
      "querySelector",
      "querySelectorAll",
      "getElementInfo",
      "getBoundingRect",
      "isVisible",
      "isEnabled",
      "elementExists",
      "countElements",
      // Frame operations
      "getFrames",
      // Text operations
      "selectText",
      "copyText",
      "getText",
      // Media control
      "mediaPlay",
      "mediaPause",
      "mediaSetVolume",
      "mediaGetState",
      // Position-based operations
      "clickAtPosition",
      "hoverAtPosition",
      // Element state
      "scrollIntoView",
      "getComputedStyle",
      "getScrollPosition",
      "setScrollPosition",
      // Performance
      "getPerformance",
      // Window info
      "getWindowInfo",
      // Accessibility
      "getAccessibilityTree",
    ],
    meta: {
      url: tab.url,
      title: tab.title,
      tabId: tab.id,
      windowId: tab.windowId,
      userAgent: navigator.userAgent,
    },
  });
}

function unregisterTab(tabId) {
  // Server will handle cleanup when connection drops
  // For now, we don't send explicit unregister
}

// ============================================================
// Handle Server Commands
// ============================================================

async function handleServerMessage(message) {
  if (message.type === "execute") {
    const result = await executeCommand(message);
    send(result);
  } else if (message.type === "control") {
    if (message.action === "ping") {
      send({ type: "pong", executorId: "browser", timestamp: Date.now() });
    }
  }
}

async function executeCommand(command) {
  const { id, action, params } = command;
  console.log("[WireAgent] Executing:", action, params);

  try {
    // Extract tabId from executorId if present
    let tabId = null;
    if (params.executorId) {
      const match = params.executorId.match(/browser:tab:(\d+)/);
      if (match) {
        tabId = parseInt(match[1], 10);
      }
    }

    // If no specific tab, use active tab
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab) {
        tabId = activeTab.id;
      }
    }

    // ============================================================
    // Tab Management Actions (Chrome API - no content script needed)
    // ============================================================

    if (action === "tabList") {
      const tabs = await chrome.tabs.query(params.windowId ? { windowId: params.windowId } : {});
      const data = tabs.map((tab) => ({
        id: tab.id,
        windowId: tab.windowId,
        url: tab.url,
        title: tab.title,
        active: tab.active,
        pinned: tab.pinned,
        index: tab.index,
      }));
      return { type: "result", id, success: true, data };
    }

    if (action === "tabCreate") {
      const newTab = await chrome.tabs.create({
        url: params.url || "about:blank",
        active: params.active !== false,
      });
      return { type: "result", id, success: true, data: { tabId: newTab.id, url: newTab.url } };
    }

    if (action === "tabClose") {
      const targetTabId = params.tabId || tabId;
      if (!targetTabId) {
        return { type: "result", id, success: false, error: "No tab specified" };
      }
      await chrome.tabs.remove(targetTabId);
      return { type: "result", id, success: true };
    }

    if (action === "tabActivate") {
      await chrome.tabs.update(params.tabId, { active: true });
      return { type: "result", id, success: true };
    }

    if (action === "tabReload") {
      const targetTabId = params.tabId || tabId;
      if (!targetTabId) {
        return { type: "result", id, success: false, error: "No tab specified" };
      }
      await chrome.tabs.reload(targetTabId, { bypassCache: params.bypassCache || false });
      return { type: "result", id, success: true };
    }

    if (action === "tabDuplicate") {
      const targetTabId = params.tabId || tabId;
      if (!targetTabId) {
        return { type: "result", id, success: false, error: "No tab specified" };
      }
      const newTab = await chrome.tabs.duplicate(targetTabId);
      return { type: "result", id, success: true, data: { tabId: newTab.id } };
    }

    // ============================================================
    // Navigation Actions (Chrome API)
    // ============================================================

    if (!tabId) {
      return { type: "result", id, success: false, error: "No active tab" };
    }

    if (action === "navigate") {
      await chrome.tabs.update(tabId, { url: params.url });
      return { type: "result", id, success: true };
    }

    if (action === "goBack") {
      await chrome.tabs.goBack(tabId);
      return { type: "result", id, success: true };
    }

    if (action === "goForward") {
      await chrome.tabs.goForward(tabId);
      return { type: "result", id, success: true };
    }

    if (action === "getUrl") {
      const tab = await chrome.tabs.get(tabId);
      return { type: "result", id, success: true, data: tab.url };
    }

    if (action === "getTitle") {
      const tab = await chrome.tabs.get(tabId);
      return { type: "result", id, success: true, data: tab.title };
    }

    // ============================================================
    // Screenshot Actions (Chrome API)
    // ============================================================

    if (action === "screenshot") {
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      return { type: "result", id, success: true, data: base64 };
    }

    // ============================================================
    // Cookie Actions (Chrome API)
    // ============================================================

    if (action === "cookieGet") {
      const tab = await chrome.tabs.get(tabId);
      const url = params.url || tab.url;
      const cookie = await chrome.cookies.get({ url, name: params.name });
      return { type: "result", id, success: true, data: cookie };
    }

    if (action === "cookieSet") {
      const tab = await chrome.tabs.get(tabId);
      const url = params.url || tab.url;
      const cookieDetails = {
        url,
        name: params.name,
        value: params.value,
      };
      if (params.domain) cookieDetails.domain = params.domain;
      if (params.path) cookieDetails.path = params.path;
      if (params.secure !== undefined) cookieDetails.secure = params.secure;
      if (params.httpOnly !== undefined) cookieDetails.httpOnly = params.httpOnly;
      if (params.expirationDate) cookieDetails.expirationDate = params.expirationDate;
      if (params.sameSite) cookieDetails.sameSite = params.sameSite;

      await chrome.cookies.set(cookieDetails);
      return { type: "result", id, success: true };
    }

    if (action === "cookieDelete") {
      const tab = await chrome.tabs.get(tabId);
      const url = params.url || tab.url;
      await chrome.cookies.remove({ url, name: params.name });
      return { type: "result", id, success: true };
    }

    if (action === "cookieGetAll") {
      const tab = await chrome.tabs.get(tabId);
      const url = params.url || tab.url;
      const details = {};
      if (url) details.url = url;
      if (params.domain) details.domain = params.domain;
      const cookies = await chrome.cookies.getAll(details);
      return { type: "result", id, success: true, data: cookies };
    }

    // ============================================================
    // Content Script Actions (forward to content script)
    // ============================================================

    const response = await chrome.tabs.sendMessage(tabId, {
      type: "EXECUTE_ACTION",
      action,
      params,
    });

    return { type: "result", id, ...response };
  } catch (err) {
    return { type: "result", id, success: false, error: err.message };
  }
}

// ============================================================
// Tab Event Listeners
// ============================================================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isConnected && changeInfo.status === "complete" && tab.url) {
    // Update state
    send({
      type: "state",
      executorId: getExecutorId(tabId),
      meta: { url: tab.url, title: tab.title },
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  unregisterTab(tabId);
});

chrome.tabs.onCreated.addListener((tab) => {
  if (isConnected && tab.url && !tab.url.startsWith("chrome://")) {
    registerTab(tab);
  }
});

// ============================================================
// Status Broadcast to Side Panel
// ============================================================

function broadcastStatus(connected) {
  chrome.runtime.sendMessage({
    type: "CONNECTION_STATUS",
    connected,
  }).catch(() => {
    // Panel might not be open
  });
}

// ============================================================
// Message Handlers from Panel/Content Script
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATUS") {
    // Check actual WebSocket state, not just the flag
    const actuallyConnected = ws && ws.readyState === WebSocket.OPEN;
    sendResponse({ connected: actuallyConnected });
    return true;
  }

  if (message.type === "RECONNECT") {
    connect();
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

// ============================================================
// Action Click Handler
// ============================================================

chrome.action.onClicked.addListener(async (tab) => {
  // Open side panel (Chrome 114+)
  if (chrome.sidePanel && chrome.sidePanel.open) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } else {
    // Fallback for older Chrome versions
    console.warn("[WireAgent] Side panel API not available. Chrome 114+ required.");
  }
});

// ============================================================
// Initialize
// ============================================================

connect();
console.log("[WireAgent] Background script initialized");
