// ============================================================
// Wire Agent Protocol - 通用 Executor 通信协议
// ============================================================

// Executor 平台类型
export type Platform = "browser" | "mobile" | "desktop";

// 选择器类型
export type SelectorType = "css" | "xpath" | "accessibility" | "text";

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
