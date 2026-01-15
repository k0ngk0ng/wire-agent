// Wire Agent - Browser Executor Background Script
// Connects to Wire Agent Server via WebSocket and routes commands to content scripts

const WS_URL = "ws://localhost:3000";
const RECONNECT_INTERVAL = 3000;

let ws = null;
let isConnected = false;
let reconnectTimer = null;

// Generate executor ID based on extension ID
function getExecutorId(tabId) {
  return `browser:tab:${tabId}`;
}

// ============================================================
// WebSocket Connection
// ============================================================

function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  console.log("[WireAgent] Connecting to server...");

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("[WireAgent] Connected to server");
      isConnected = true;
      broadcastStatus(true);

      // Register all active tabs
      registerAllTabs();
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        await handleServerMessage(message);
      } catch (err) {
        console.error("[WireAgent] Failed to handle message:", err);
      }
    };

    ws.onclose = () => {
      console.log("[WireAgent] Disconnected from server");
      isConnected = false;
      ws = null;
      broadcastStatus(false);
      scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.error("[WireAgent] WebSocket error:", err);
    };
  } catch (err) {
    console.error("[WireAgent] Failed to connect:", err);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_INTERVAL);
}

function send(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// ============================================================
// Tab Registration
// ============================================================

async function registerAllTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && !tab.url.startsWith("chrome://")) {
      registerTab(tab);
    }
  }
}

function registerTab(tab) {
  send({
    type: "register",
    executorId: getExecutorId(tab.id),
    platform: "browser",
    capabilities: [
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

    if (!tabId) {
      return { type: "result", id, success: false, error: "No active tab" };
    }

    // Handle navigate separately (doesn't need content script)
    if (action === "navigate") {
      await chrome.tabs.update(tabId, { url: params.url });
      return { type: "result", id, success: true };
    }

    // Handle screenshot separately
    if (action === "screenshot") {
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      return { type: "result", id, success: true, data: base64 };
    }

    // Send to content script for DOM operations
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
    sendResponse({ connected: isConnected });
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
  // Open side panel
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// ============================================================
// Initialize
// ============================================================

connect();
console.log("[WireAgent] Background script initialized");
