/**
 * Wails 命令类型定义
 */

// AI Action 类型
export type AIAction = 'polish' | 'expand' | 'summarize' | 'tone';

/**
 * Tauri invoke 函数类型（兼容）
 */
export type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
