// Wire Agent - Side Panel Script

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const reconnectBtn = document.getElementById("reconnectBtn");
const logContainer = document.getElementById("logContainer");

let logs = [];
const MAX_LOGS = 50;

// ============================================================
// Status Updates
// ============================================================

function updateStatus(connected) {
  if (connected) {
    statusDot.classList.add("connected");
    statusText.textContent = "Connected to server";
    reconnectBtn.disabled = true;
  } else {
    statusDot.classList.remove("connected");
    statusText.textContent = "Disconnected";
    reconnectBtn.disabled = false;
  }
}

// ============================================================
// Logging
// ============================================================

function addLog(message, success = true) {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour12: false });

  logs.unshift({ time, message, success });
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(0, MAX_LOGS);
  }

  renderLogs();
}

function renderLogs() {
  if (logs.length === 0) {
    logContainer.innerHTML = '<div class="empty-state">Waiting for commands...</div>';
    return;
  }

  logContainer.innerHTML = logs
    .map(
      (log) => `
      <div class="log-entry ${log.success ? "success" : "error"}">
        <span class="time">${log.time}</span>
        ${escapeHtml(log.message)}
      </div>
    `
    )
    .join("");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================
// Event Handlers
// ============================================================

reconnectBtn.addEventListener("click", () => {
  reconnectBtn.disabled = true;
  chrome.runtime.sendMessage({ type: "RECONNECT" }, (response) => {
    addLog("Reconnecting...");
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
        updateStatus(res?.connected || false);
      });
    }, 1000);
  });
});

// ============================================================
// Message Listener
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONNECTION_STATUS") {
    updateStatus(message.connected);
    addLog(message.connected ? "Connected" : "Disconnected", message.connected);
  }

  if (message.type === "COMMAND_EXECUTED") {
    addLog(`${message.action}: ${message.result}`, message.success);
  }

  return false;
});

// ============================================================
// Initialize
// ============================================================

chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
  updateStatus(response?.connected || false);
});

console.log("[WireAgent] Panel initialized");
