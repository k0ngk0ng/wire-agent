# Wire Agent

Universal UI automation agent with MCP integration. Control browsers, mobile apps, and desktop applications through Claude Code.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Code CLI                                                 │
│  claude --mcp-config=mcp.json -p "..."                          │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ MCP Protocol (stdio)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Wire Agent Server                                               │
│  - MCP Server: Exposes ui_* tools to Claude Code                │
│  - WebSocket Server: Manages executor connections               │
│  - Executor Manager: Routes commands to connected executors     │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Executors                                                       │
│  ├── Browser (Chrome Extension)                                 │
│  └── Mobile (Future)                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Start Server

```bash
npm run dev:server
```

### 4. Load Browser Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `executors/browser` directory

### 5. Configure Claude Code

Add to your Claude Code MCP config (`~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "wire-agent": {
      "command": "node",
      "args": ["<path-to-wire-agent>/server/dist/index.js"]
    }
  }
}
```

### 6. Use with Claude Code

```bash
claude -p "Navigate to google.com and search for 'Claude AI'"
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `executor_list` | List all connected executors |
| `executor_use` | Set default executor |
| `ui_navigate` | Navigate to URL |
| `ui_click` | Click element |
| `ui_type` | Type text into input |
| `ui_scroll` | Scroll page/element |
| `ui_screenshot` | Take screenshot |
| `ui_get_content` | Get page/element content |
| `ui_get_attribute` | Get element attribute |
| `ui_wait` | Wait for element/duration |
| `ui_eval` | Execute JavaScript |

## Project Structure

```
wire-agent/
├── server/                 # MCP + WebSocket Server
│   └── src/
│       ├── index.ts       # Entry point
│       ├── mcp/           # MCP server & tools
│       ├── executor/      # Executor manager
│       └── ws/            # WebSocket server
├── executors/
│   └── browser/           # Chrome Extension
└── packages/
    └── protocol/          # Shared types
```

## Development

```bash
# Watch mode for server
npm run dev:server

# Build all
npm run build
```

## License

MIT
