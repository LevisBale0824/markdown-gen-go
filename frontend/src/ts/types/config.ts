/**
 * 配置类型定义
 * 简单接口类型，与 Go 后端对齐
 */

// AI 配置
export interface AIConfig {
  provider: string;
  apiKey: string;
  apiEndpoint: string;
  model: string;
  maxTokens: number;
}

// 应用配置
export interface AppConfig {
  ai: AIConfig;
  theme: string;
  lastDir: string;
}

// 文件信息
export interface FileInfo {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modTime: string;
}

export type ThemeType = 'light' | 'dark' | 'custom';

export interface CustomTheme {
  enabled: boolean;
  name: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  codeBackgroundColor: string;
  secondaryBackgroundColor: string;
  mutedTextColor: string;
}

export interface AppSettings {
  ai: AIConfig;
  theme: string;
  lastDir: string;
  language: 'zh' | 'en';
  customTheme: CustomTheme;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'glm',
  apiKey: '',
  apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  model: 'glm-4-flash',
  maxTokens: 4096,
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  ai: DEFAULT_AI_CONFIG,
  theme: 'dark',
  lastDir: '',
};

export const DEFAULT_CUSTOM_THEME: CustomTheme = {
  enabled: false,
  name: 'Custom',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  accentColor: '#2563eb',
  borderColor: '#e5e7eb',
  codeBackgroundColor: '#f3f4f6',
  secondaryBackgroundColor: '#f9fafb',
  mutedTextColor: '#6b7280',
};
