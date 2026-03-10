/**
 * AI 相关类型定义
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIAssistantOptions {
  chatContainer: HTMLElement;
  inputElement: HTMLTextAreaElement;
  statusElement: HTMLElement;
}

export type AIStatus = 'ready' | 'thinking' | 'error';
