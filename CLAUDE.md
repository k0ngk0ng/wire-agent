# Wire Agent

通用 UI 自动化代理，通过 MCP 协议与 Claude Code 集成，支持浏览器、桌面和未来的移动端。

## 架构概览

```
Claude Code CLI
      ↓ MCP Protocol (stdio)
Wire Agent Server (Node.js)
      ↓ WebSocket (:3888)
Executors (Browser Extension / Desktop App / Mobile App)
```

**核心设计**:

- Server 作为 MCP Server，暴露 `ui_*` 和 `desktop_*` 工具给 Claude Code
- Executor 是通用抽象层，browser/desktop/mobile 都实现相同的 WebSocket 协议
- 支持多标签页/多设备，通过 `executorId` 区分
- 不同平台拥有不同的工具集（见下方平台能力对比）

## 目录结构

- `server/` - MCP Server + WebSocket Server (TypeScript)
  - `src/mcp/` - MCP 协议处理和工具定义
  - `src/ws/` - WebSocket 服务器
  - `src/executor/` - Executor 管理器
  - `src/utils/` - 日志等工具函数
- `executors/browser/` - Chrome Extension (MV3)
- `executors/desktop/` - Desktop Agent (Node.js, 支持 Windows/macOS/Linux)
- `executors/mobile/` - 未来: iOS/Android
- `packages/protocol/` - 共享协议类型定义

## 开发命令

```bash
# 安装依赖
npm install

# 编译
npm run build

# 开发模式 (server)
npm run dev:server

# 运行测试
npm test -w server

# 单独编译
npm run build:protocol
npm run build:server
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WS_PORT` | 3000 | WebSocket 服务器端口 |
| `LOG_LEVEL` | info | 日志级别 (debug/info/warn/error) |

## MCP 工具

### Executor 管理

| 工具 | 说明 |
|------|------|
| `executor_list` | 列出所有连接的 Executor |
| `executor_use` | 设置默认 Executor |

### 基础交互

| 工具 | 说明 |
|------|------|
| `ui_navigate` | 导航到 URL |
| `ui_click` | 点击元素 |
| `ui_double_click` | 双击元素 |
| `ui_right_click` | 右键点击元素 (上下文菜单) |
| `ui_hover` | 悬停在元素上 |
| `ui_type` | 输入文本 |
| `ui_keyboard` | 模拟键盘按键 (支持组合键) |
| `ui_scroll` | 滚动页面 |
| `ui_focus` | 聚焦元素 |
| `ui_blur` | 移除元素焦点 |

### 高级交互

| 工具 | 说明 |
|------|------|
| `ui_drag_drop` | 拖放元素 |
| `ui_select` | 选择下拉框选项 |
| `ui_highlight` | 高亮元素 (调试用) |

### 信息获取

| 工具 | 说明 |
|------|------|
| `ui_screenshot` | 截图 |
| `ui_get_content` | 获取页面内容 |
| `ui_get_attribute` | 获取元素属性 |
| `ui_wait` | 等待元素/时间 |
| `ui_eval` | 执行 JavaScript |

### 标签页管理 (Browser Only)

| 工具 | 说明 |
|------|------|
| `ui_tab_list` | 列出所有打开的标签页 |
| `ui_tab_create` | 创建新标签页 |
| `ui_tab_close` | 关闭标签页 |
| `ui_tab_activate` | 激活/聚焦指定标签页 |
| `ui_tab_reload` | 重新加载标签页 |
| `ui_tab_duplicate` | 复制标签页 |

### 导航 (Browser Only)

| 工具 | 说明 |
|------|------|
| `ui_go_back` | 浏览器后退 |
| `ui_go_forward` | 浏览器前进 |
| `ui_get_url` | 获取当前页面 URL |
| `ui_get_title` | 获取当前页面标题 |

### 存储与 Cookie (Browser Only)

| 工具 | 说明 |
|------|------|
| `ui_storage_get` | 读取 localStorage/sessionStorage |
| `ui_storage_set` | 写入 localStorage/sessionStorage |
| `ui_storage_clear` | 清空 localStorage/sessionStorage |
| `ui_cookie_get` | 获取指定 Cookie |
| `ui_cookie_set` | 设置 Cookie |
| `ui_cookie_delete` | 删除 Cookie |
| `ui_cookie_get_all` | 获取所有 Cookie |

### 表单操作 (Browser Only)

| 工具 | 说明 |
|------|------|
| `ui_form_submit` | 提交表单 |
| `ui_form_reset` | 重置表单 |
| `ui_checkbox` | 设置复选框/单选框状态 |

### 元素查询 (Browser Only)

| 工具 | 说明 |
|------|------|
| `ui_query_selector` | 查询单个元素并返回信息 |
| `ui_query_selector_all` | 查询所有匹配元素 |
| `ui_get_element_info` | 获取元素详细信息 |
| `ui_get_bounding_rect` | 获取元素位置和尺寸 |
| `ui_is_visible` | 检查元素是否可见 |
| `ui_is_enabled` | 检查元素是否启用 |
| `ui_element_exists` | 检查元素是否存在 |
| `ui_count_elements` | 统计匹配元素数量 |

### 框架操作 (Browser Only)

| 工具 | 说明 |
|------|------|
| `ui_get_frames` | 获取页面中所有 iframe/frame |

### 文本操作 (Browser Only)

| 工具 | 说明 |
|------|------|
| `ui_select_text` | 选择元素中的文本 |
| `ui_copy_text` | 复制文本到剪贴板 |
| `ui_get_text` | 获取元素文本内容 |

### 媒体控制 (Browser Only)

| 工具 | 说明 |
|------|------|
| `ui_media_play` | 播放视频/音频 |
| `ui_media_pause` | 暂停视频/音频 |
| `ui_media_set_volume` | 设置音量 (0-1) |
| `ui_media_get_state` | 获取媒体播放状态 |

### 坐标操作 (Browser Only)

| 工具 | 说明 |
|------|------|
| `ui_click_at_position` | 在指定坐标点击 |
| `ui_hover_at_position` | 在指定坐标悬停 |

### 元素状态 (Browser Only)

| 工具 | 说明 |
|------|------|
| `ui_scroll_into_view` | 滚动元素到可视区域 |
| `ui_get_computed_style` | 获取计算后的 CSS 样式 |
| `ui_get_scroll_position` | 获取滚动位置 |
| `ui_set_scroll_position` | 设置滚动位置 |

### 性能与调试 (Browser Only)

| 工具 | 说明 |
|------|------|
| `ui_get_performance` | 获取页面性能指标 |
| `ui_get_window_info` | 获取窗口信息 |
| `ui_get_accessibility_tree` | 获取无障碍树 |

### 桌面端专属工具 (Desktop Only)

这些工具只能在桌面 Executor (Windows/macOS/Linux) 上使用：

#### 鼠标操作

| 工具 | 说明 |
|------|------|
| `desktop_mouse_click` | 在屏幕坐标点击 |
| `desktop_mouse_move` | 移动鼠标到指定坐标 |
| `desktop_mouse_drag` | 拖拽鼠标 |

#### 窗口管理

| 工具 | 说明 |
|------|------|
| `desktop_window_list` | 列出所有打开的窗口 |
| `desktop_window_focus` | 聚焦/激活指定窗口 |
| `desktop_window_state` | 改变窗口状态 (最小化/最大化/还原/关闭) |

#### 剪贴板

| 工具 | 说明 |
|------|------|
| `desktop_clipboard_read` | 读取系统剪贴板内容 |
| `desktop_clipboard_write` | 写入内容到系统剪贴板 |

#### 系统操作

| 工具 | 说明 |
|------|------|
| `desktop_shell_exec` | 执行 shell 命令 |
| `desktop_app_launch` | 启动应用程序 |
| `desktop_app_close` | 关闭应用程序 |
| `desktop_notify` | 显示系统通知 |

#### 文件操作

| 工具 | 说明 |
|------|------|
| `desktop_file_read` | 读取文件内容 |
| `desktop_file_write` | 写入文件内容 |
| `desktop_file_exists` | 检查文件是否存在 |

## 平台能力对比

| 能力 | Browser | Desktop | Mobile (Future) |
|------|---------|---------|-----------------|
| 元素点击/输入 | ✅ CSS/XPath 选择器 | ✅ 坐标点击 | ✅ |
| 截图 | ✅ | ✅ | ✅ |
| 键盘输入 | ✅ | ✅ | ✅ |
| 标签页管理 | ✅ | ❌ | ❌ |
| 窗口管理 | ❌ | ✅ | ❌ |
| Cookie/存储 | ✅ | ❌ | ❌ |
| 剪贴板 | ✅ | ✅ | ❌ |
| Shell 执行 | ❌ | ✅ | ❌ |
| 文件操作 | ❌ | ✅ | ❌ |
| 系统通知 | ❌ | ✅ | ✅ |
| JavaScript 执行 | ✅ | ❌ | ❌ |
| DOM 操作 | ✅ | ❌ | ❌ |
| 媒体控制 | ✅ | ❌ | ❌ |
| 性能监控 | ✅ | ❌ | ❌ |
| 无障碍树 | ✅ | ❌ | ❌ |

### 选择器类型

所有涉及元素的工具都支持以下选择器类型 (`selectorType` 参数):

| 类型 | 说明 | 示例 |
|------|------|------|
| `css` (默认) | CSS 选择器 | `button.submit`, `#login-form` |
| `xpath` | XPath 表达式 | `//button[@type='submit']` |
| `text` | 包含文本的元素 | `Login` |
| `accessibility` | 无障碍 ID (aria-label/id/name) | `submit-button` |

## WebSocket 协议

**Executor → Server**:
- `register`: 注册 executor，包含 platform/capabilities/meta
- `result`: 工具执行结果
- `state`: 状态更新 (URL 变化等)
- `pong`: 心跳响应

**Server → Executor**:
- `execute`: 执行命令 { action, params }
- `control`: 控制命令 (ping/disconnect)

## 使用方式

1. 启动 Server: `npm run dev:server`
2. 加载 Chrome Extension: `chrome://extensions` → Load unpacked → `executors/browser`
3. 配置 Claude Code MCP (`~/.claude/mcp.json`):
```json
{
  "mcpServers": {
    "wire-agent": {
      "command": "node",
      "args": ["<path>/wire-agent/server/dist/index.js"]
    }
  }
}
```
4. 使用: `claude -p "Navigate to google.com and search for 'Claude AI'"`

### 使用桌面 Executor

1. 编译桌面端: `npm run build -w @wire-agent/desktop`
2. 启动桌面 Executor: `node executors/desktop/dist/index.js`
3. 桌面 Executor 会自动连接到 WebSocket 服务器并注册
4. 使用桌面工具: `claude -p "Take a screenshot and list all windows"`

**注意**: 桌面 Executor 需要额外的系统依赖：

- **robotjs**: 需要 Python 和编译工具 (node-gyp)
- **Windows**: 需要 Visual Studio Build Tools
- **macOS**: 需要 Xcode Command Line Tools
- **Linux**: 需要 `libxtst-dev` 和 `libpng-dev`

## 扩展开发

### 添加新工具

1. 在 `packages/protocol/src/index.ts` 添加参数类型定义
2. 在 `server/src/mcp/server.ts` 的 `tools` 数组添加工具定义
3. 在 `handleToolCall` 函数添加处理逻辑
4. 在 `executors/browser/contentScript.js` 的 `actionHandlers` 添加 DOM 操作
5. 更新 `executors/browser/background.js` 的 `capabilities` 列表

### 添加新 Executor (如 mobile)

1. 创建 `executors/mobile/` 目录
2. 实现 WebSocket 客户端，遵循 `packages/protocol` 定义的协议
3. 实现对应的 action handlers
4. 注册时声明支持的 capabilities

## 测试

```bash
# 运行单元测试
npm test -w server

# 监视模式
npm run test:watch -w server
```
