// Wire Agent - Side Panel Script

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const reconnectBtn = document.getElementById("reconnectBtn");
const commandList = document.getElementById("commandList");

let commands = [];
const MAX_COMMANDS = 20;

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
  reconnectBtn.disabled = false;
}

// ============================================================
// Command Display
// ============================================================

function addCommand(action, params, status = "pending") {
  const time = new Date().toLocaleTimeString("en-US", { hour12: false });

  commands.unshift({ action, params, status, time, id: Date.now() });
  if (commands.length > MAX_COMMANDS) {
    commands = commands.slice(0, MAX_COMMANDS);
  }

  renderCommands();
  return commands[0].id;
}

function updateCommandStatus(id, status) {
  const cmd = commands.find(c => c.id === id);
  if (cmd) {
    cmd.status = status;
    renderCommands();
  }
}

function renderCommands() {
  if (commands.length === 0) {
    commandList.innerHTML = '<div class="empty-state">Waiting for commands...</div>';
    return;
  }

  commandList.innerHTML = commands.map(cmd => {
    const paramsStr = cmd.params ? JSON.stringify(cmd.params).slice(0, 100) : "";
    return `
      <div class="command-item ${cmd.status}">
        <span class="command-action">${escapeHtml(cmd.action)}</span>
        <span class="command-time">${cmd.time}</span>
        ${paramsStr ? `<div class="command-params">${escapeHtml(paramsStr)}</div>` : ""}
      </div>
    `;
  }).join("");
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
  }

  if (message.type === "COMMAND_START") {
    addCommand(message.action, message.params, "pending");
  }

  if (message.type === "COMMAND_RESULT") {
    // Update the most recent pending command with this action
    const cmd = commands.find(c => c.action === message.action && c.status === "pending");
    if (cmd) {
      cmd.status = message.success ? "success" : "error";
      renderCommands();
    } else {
      // If no pending command found, add a new one with result
      addCommand(message.action, message.params, message.success ? "success" : "error");
    }
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

refreshStatus();
setInterval(refreshStatus, 3000);

console.log("[WireAgent] Panel initialized");
