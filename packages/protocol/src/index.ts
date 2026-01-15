// ============================================================
// Wire Agent Protocol - 通用 Executor 通信协议
// ============================================================

// Executor 平台类型
export type Platform = "browser" | "mobile" | "desktop";

// 桌面操作系统类型
export type DesktopOS = "windows" | "macos" | "linux";

// 选择器类型 (浏览器)
export type SelectorType = "css" | "xpath" | "accessibility" | "text";

// 桌面端选择器类型
export type DesktopSelectorType = "window-title" | "window-class" | "process-name" | "coordinates";

// ============================================================
// Executor → Server: 注册
// ============================================================
export interface ExecutorRegister {
  type: "register";
  executorId: string;
  platform: Platform;
  capabilities: string[];
  meta: ExecutorMeta;
}

export interface ExecutorMeta {
  // Common
  userAgent?: string;
  screenSize?: { width: number; height: number };

  // Browser specific
  url?: string;
  title?: string;
  tabId?: number;
  windowId?: number;

  // Mobile specific
  appId?: string;
  deviceId?: string;
  osVersion?: string;

  // Desktop specific
  os?: DesktopOS;
  hostname?: string;
  username?: string;
  activeWindow?: string;
  displays?: Array<{ id: number; width: number; height: number; primary: boolean }>;
}

// ============================================================
// Server → Executor: 执行命令
// ============================================================
export interface ExecuteCommand {
  type: "execute";
  id: string;
  action: string;
  params: Record<string, unknown>;
}

// 具体命令参数
export interface NavigateParams {
  url: string;
}

export interface ClickParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface TypeParams {
  selector: string;
  text: string;
  selectorType?: SelectorType;
  clearFirst?: boolean;
}

export interface ScrollParams {
  direction: "up" | "down" | "left" | "right";
  amount?: number;
  selector?: string;
}

export interface HoverParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface DoubleClickParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface RightClickParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface KeyboardParams {
  key: string;
  modifiers?: ("ctrl" | "alt" | "shift" | "meta")[];
  selector?: string;
  selectorType?: SelectorType;
}

export interface DragDropParams {
  sourceSelector: string;
  targetSelector: string;
  selectorType?: SelectorType;
}

export interface HighlightParams {
  selector?: string;
  selectorType?: SelectorType;
  color?: string;
  duration?: number;
}

export interface SelectParams {
  selector: string;
  value: string | string[];
  selectorType?: SelectorType;
}

export interface FocusParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface BlurParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface ScreenshotParams {
  selector?: string;
  fullPage?: boolean;
}

export interface EvalParams {
  script: string;
}

export interface WaitParams {
  selector?: string;
  timeout?: number;
  state?: "visible" | "hidden" | "attached" | "detached";
}

export interface GetContentParams {
  selector?: string;
  includeHtml?: boolean;
}

export interface GetAttributeParams {
  selector: string;
  attribute: string;
}

// ============================================================
// Browser-specific 扩展命令参数
// ============================================================

// Tab management
export interface TabListParams {
  windowId?: number;
}

export interface TabCreateParams {
  url?: string;
  active?: boolean;
}

export interface TabCloseParams {
  tabId?: number;
}

export interface TabActivateParams {
  tabId: number;
}

export interface TabReloadParams {
  tabId?: number;
  bypassCache?: boolean;
}

export interface TabDuplicateParams {
  tabId?: number;
}

// Navigation
export interface GoBackParams {}

export interface GoForwardParams {}

export interface GetUrlParams {}

export interface GetTitleParams {}

// Storage
export interface StorageGetParams {
  key: string;
  storageType?: "local" | "session";
}

export interface StorageSetParams {
  key: string;
  value: string;
  storageType?: "local" | "session";
}

export interface StorageClearParams {
  storageType?: "local" | "session";
}

// Cookies
export interface CookieGetParams {
  name: string;
  url?: string;
}

export interface CookieSetParams {
  name: string;
  value: string;
  url?: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  expirationDate?: number;
  sameSite?: "no_restriction" | "lax" | "strict";
}

export interface CookieDeleteParams {
  name: string;
  url?: string;
}

export interface CookieGetAllParams {
  url?: string;
  domain?: string;
}

// Forms
export interface FormSubmitParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface FormResetParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface CheckboxParams {
  selector: string;
  checked: boolean;
  selectorType?: SelectorType;
}

export interface FileUploadParams {
  selector: string;
  files: Array<{ name: string; content: string; mimeType?: string }>;
  selectorType?: SelectorType;
}

// Element queries
export interface QuerySelectorParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface QuerySelectorAllParams {
  selector: string;
  selectorType?: SelectorType;
  limit?: number;
}

export interface GetElementInfoParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface GetBoundingRectParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface IsVisibleParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface IsEnabledParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface ElementExistsParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface CountElementsParams {
  selector: string;
  selectorType?: SelectorType;
}

// Frame operations
export interface SwitchToFrameParams {
  selector?: string;
  index?: number;
  selectorType?: SelectorType;
}

export interface SwitchToMainParams {}

export interface GetFramesParams {}

// Screenshot extensions
export interface ScreenshotFullPageParams {}

export interface ScreenshotElementParams {
  selector: string;
  selectorType?: SelectorType;
}

// Text operations
export interface SelectTextParams {
  selector: string;
  start?: number;
  end?: number;
  selectorType?: SelectorType;
}

export interface CopyTextParams {
  selector?: string;
  selectorType?: SelectorType;
}

export interface GetTextParams {
  selector: string;
  selectorType?: SelectorType;
}

// Media control
export interface MediaPlayParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface MediaPauseParams {
  selector: string;
  selectorType?: SelectorType;
}

export interface MediaSetVolumeParams {
  selector: string;
  volume: number;
  selectorType?: SelectorType;
}

export interface MediaGetStateParams {
  selector: string;
  selectorType?: SelectorType;
}

// Position-based operations
export interface ClickAtPositionParams {
  x: number;
  y: number;
  button?: "left" | "right" | "middle";
}

export interface HoverAtPositionParams {
  x: number;
  y: number;
}

// Element state
export interface ScrollIntoViewParams {
  selector: string;
  selectorType?: SelectorType;
  behavior?: "auto" | "smooth";
  block?: "start" | "center" | "end" | "nearest";
}

export interface GetComputedStyleParams {
  selector: string;
  property?: string;
  selectorType?: SelectorType;
}

export interface GetScrollPositionParams {
  selector?: string;
  selectorType?: SelectorType;
}

export interface SetScrollPositionParams {
  x: number;
  y: number;
  selector?: string;
  selectorType?: SelectorType;
  behavior?: "auto" | "smooth";
}

// Performance
export interface GetPerformanceParams {}

// PDF
export interface PrintToPdfParams {}

// Console logs
export interface GetConsoleLogsParams {
  level?: "log" | "warn" | "error" | "info" | "debug" | "all";
  limit?: number;
}

export interface ClearConsoleLogsParams {}

// Dialogs
export interface HandleDialogParams {
  action: "accept" | "dismiss";
  promptText?: string;
}

// Downloads
export interface GetDownloadsParams {
  limit?: number;
}

// Window info
export interface GetWindowInfoParams {}

// Accessibility
export interface GetAccessibilityTreeParams {
  selector?: string;
  selectorType?: SelectorType;
}

// Mutation observer
export interface ObserveDOMParams {
  selector: string;
  selectorType?: SelectorType;
  options?: {
    childList?: boolean;
    attributes?: boolean;
    characterData?: boolean;
    subtree?: boolean;
  };
}

export interface StopObserveDOMParams {
  observerId: string;
}

// ============================================================
// Desktop-specific 命令参数
// ============================================================

// 鼠标操作 (坐标点击)
export interface MouseClickParams {
  x: number;
  y: number;
  button?: "left" | "right" | "middle";
  clicks?: number; // 1 = single, 2 = double
}

export interface MouseMoveParams {
  x: number;
  y: number;
  duration?: number; // 移动时长 (ms)
}

export interface MouseDragParams {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration?: number;
}

// 窗口操作
export interface WindowListParams {
  includeMinimized?: boolean;
}

export interface WindowFocusParams {
  title?: string;
  processName?: string;
  windowClass?: string;
}

export interface WindowResizeParams {
  title?: string;
  processName?: string;
  width: number;
  height: number;
}

export interface WindowMoveParams {
  title?: string;
  processName?: string;
  x: number;
  y: number;
}

export interface WindowStateParams {
  title?: string;
  processName?: string;
  state: "minimize" | "maximize" | "restore" | "close";
}

// 剪贴板操作
export interface ClipboardReadParams {
  format?: "text" | "html" | "image";
}

export interface ClipboardWriteParams {
  text: string;
}

// 系统命令
export interface ShellExecParams {
  command: string;
  cwd?: string;
  timeout?: number;
}

export interface AppLaunchParams {
  path: string;
  args?: string[];
}

export interface AppCloseParams {
  processName?: string;
  pid?: number;
}

// 文件操作
export interface FileReadParams {
  path: string;
  encoding?: string;
}

export interface FileWriteParams {
  path: string;
  content: string;
  encoding?: string;
}

export interface FileExistsParams {
  path: string;
}

// 通知
export interface NotifyParams {
  title: string;
  message: string;
  icon?: string;
}

// ============================================================
// Executor → Server: 执行结果
// ============================================================
export interface ExecuteResult {
  type: "result";
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================================
// Executor → Server: 状态更新
// ============================================================
export interface StateUpdate {
  type: "state";
  executorId: string;
  meta: Partial<ExecutorMeta>;
}

// ============================================================
// Server → Executor: 控制命令
// ============================================================
export interface ControlCommand {
  type: "control";
  action: "ping" | "disconnect";
}

// ============================================================
// Executor → Server: 心跳响应
// ============================================================
export interface PongMessage {
  type: "pong";
  executorId: string;
  timestamp: number;
}

// ============================================================
// 消息联合类型
// ============================================================
export type ClientMessage =
  | ExecutorRegister
  | ExecuteResult
  | StateUpdate
  | PongMessage;

export type ServerMessage =
  | ExecuteCommand
  | ControlCommand;

// ============================================================
// Executor 信息（用于列表展示）
// ============================================================
export interface ExecutorInfo {
  executorId: string;
  platform: Platform;
  capabilities: string[];
  meta: ExecutorMeta;
  connectedAt: number;
  lastActiveAt: number;
}

// ============================================================
// MCP Tool 参数（带 executorId）
// ============================================================
export interface ToolParams {
  executorId?: string;
}

export interface UiNavigateParams extends ToolParams, NavigateParams {}
export interface UiClickParams extends ToolParams, ClickParams {}
export interface UiTypeParams extends ToolParams, TypeParams {}
export interface UiScrollParams extends ToolParams, ScrollParams {}
export interface UiScreenshotParams extends ToolParams, ScreenshotParams {}
export interface UiEvalParams extends ToolParams, EvalParams {}
export interface UiWaitParams extends ToolParams, WaitParams {}
export interface UiGetContentParams extends ToolParams, GetContentParams {}
export interface UiGetAttributeParams extends ToolParams, GetAttributeParams {}
export interface UiHoverParams extends ToolParams, HoverParams {}
export interface UiDoubleClickParams extends ToolParams, DoubleClickParams {}
export interface UiRightClickParams extends ToolParams, RightClickParams {}
export interface UiKeyboardParams extends ToolParams, KeyboardParams {}
export interface UiDragDropParams extends ToolParams, DragDropParams {}
export interface UiHighlightParams extends ToolParams, HighlightParams {}
export interface UiSelectParams extends ToolParams, SelectParams {}
export interface UiFocusParams extends ToolParams, FocusParams {}
export interface UiBlurParams extends ToolParams, BlurParams {}

// Desktop-specific MCP Tool 参数
export interface DesktopMouseClickParams extends ToolParams, MouseClickParams {}
export interface DesktopMouseMoveParams extends ToolParams, MouseMoveParams {}
export interface DesktopMouseDragParams extends ToolParams, MouseDragParams {}
export interface DesktopWindowListParams extends ToolParams, WindowListParams {}
export interface DesktopWindowFocusParams extends ToolParams, WindowFocusParams {}
export interface DesktopWindowResizeParams extends ToolParams, WindowResizeParams {}
export interface DesktopWindowMoveParams extends ToolParams, WindowMoveParams {}
export interface DesktopWindowStateParams extends ToolParams, WindowStateParams {}
export interface DesktopClipboardReadParams extends ToolParams, ClipboardReadParams {}
export interface DesktopClipboardWriteParams extends ToolParams, ClipboardWriteParams {}
export interface DesktopShellExecParams extends ToolParams, ShellExecParams {}
export interface DesktopAppLaunchParams extends ToolParams, AppLaunchParams {}
export interface DesktopAppCloseParams extends ToolParams, AppCloseParams {}
export interface DesktopFileReadParams extends ToolParams, FileReadParams {}
export interface DesktopFileWriteParams extends ToolParams, FileWriteParams {}
export interface DesktopFileExistsParams extends ToolParams, FileExistsParams {}
export interface DesktopNotifyParams extends ToolParams, NotifyParams {}

// ============================================================
// 平台能力定义
// ============================================================
export const BROWSER_CAPABILITIES = [
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
  // Tab management (background script)
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
  "fileUpload",
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
  "switchToFrame",
  "switchToMain",
  "getFrames",
  // Full page screenshot
  "screenshotFullPage",
  "screenshotElement",
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
  // Network/Performance
  "getPerformance",
  // PDF
  "printToPdf",
  // Console/Logs
  "getConsoleLogs",
  "clearConsoleLogs",
  // Dialogs
  "handleDialog",
  // Downloads
  "getDownloads",
  // Window info
  "getWindowInfo",
  // Accessibility
  "getAccessibilityTree",
  // Mutation observer
  "observeDOM",
  "stopObserveDOM",
] as const;

export const DESKTOP_CAPABILITIES = [
  "screenshot",
  "keyboard",
  "type",
  "mouseClick",
  "mouseMove",
  "mouseDrag",
  "scroll",
  "windowList",
  "windowFocus",
  "windowResize",
  "windowMove",
  "windowState",
  "clipboardRead",
  "clipboardWrite",
  "shellExec",
  "appLaunch",
  "appClose",
  "fileRead",
  "fileWrite",
  "fileExists",
  "notify",
] as const;

export type BrowserCapability = typeof BROWSER_CAPABILITIES[number];
export type DesktopCapability = typeof DESKTOP_CAPABILITIES[number];
