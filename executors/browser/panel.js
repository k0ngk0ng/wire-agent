// Wire Agent - Side Panel Script

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const reconnectBtn = document.getElementById("reconnectBtn");
const tabCountEl = document.getElementById("tabCount");

// ============================================================
// Status Updates
// ============================================================

function updateStatus(connected) {
  if (connected) {
    statusDot.classList.add("connected");
    statusText.textContent = "Connected to server";
  } else {
    statusDot.classList.remove("connected");
    statusText.textContent = "Disconnected";
  }
  // Always enable reconnect button
  reconnectBtn.disabled = false;
}

function updateTabCount() {
  chrome.tabs.query({}, (tabs) => {
    const count = tabs.filter(t => t.url && !t.url.startsWith("chrome://")).length;
    tabCountEl.textContent = count;
  });
}

// ============================================================
// Event Handlers
// ============================================================

reconnectBtn.addEventListener("click", () => {
  reconnectBtn.disabled = true;
  chrome.runtime.sendMessage({ type: "RECONNECT" }, () => {
    console.log("[WireAgent] Reconnecting...");
    setTimeout(refreshStatus, 1000);
  });
});

// ============================================================
// Message Listener
// ============================================================

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "CONNECTION_STATUS") {
    updateStatus(message.connected);
    console.log("[WireAgent]", message.connected ? "Connected" : "Disconnected");
  }
  return false;
});

// ============================================================
// Initialize
// ============================================================

function refreshStatus() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
    updateStatus(response?.connected || false);
  });
}

// Initial status check
refreshStatus();
updateTabCount();

// Poll status every 3 seconds
setInterval(refreshStatus, 3000);
setInterval(updateTabCount, 5000);

console.log("[WireAgent] Panel initialized - Activity logs will appear here");
