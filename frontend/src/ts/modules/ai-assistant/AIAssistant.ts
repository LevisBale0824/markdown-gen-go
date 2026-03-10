/**
 * AI 助手模块
 */

import type { AIAction } from '../../types';
import { tauriBridge } from '../../core';
import type { Editor } from '../editor';

/**
 * AI 助手类
 */
export class AIAssistant {
  private chatMessages: HTMLElement;
  private aiInput: HTMLTextAreaElement;
  private editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
    this.chatMessages = document.getElementById('chat-messages') as HTMLElement;
    this.aiInput = document.getElementById('ai-input') as HTMLTextAreaElement;
    this.init();
  }

  /**
   * 初始化
   */
  private init(): void {
    // Enter 发送，Shift+Enter 换行
    this.aiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  /**
   * 发送消息
   */
  async sendMessage(): Promise<void> {
    const message = this.aiInput.value.trim();
    if (!message) return;

    // 清空输入
    this.aiInput.value = '';

    // 获取文档上下文（前1000字符）
    const context = this.editor.getContent().substring(0, 1000);

    // 添加用户消息
    this.addMessage(message, 'user');

    // 显示加载
    this.addLoadingIndicator();
    this.updateStatus('thinking');

    try {
      const response = await tauriBridge.aiChat(message, context);

      this.removeLoadingIndicator();
      this.addMessage(response, 'assistant');
      this.updateStatus('ready');
    } catch (error) {
      this.removeLoadingIndicator();
      this.addMessage(`Error: ${error}`, 'assistant');
      this.updateStatus('error');
    }
  }

  /**
   * 快捷操作
   */
  async quickAction(action: AIAction): Promise<void> {
    // 获取选中文本或整个文档
    let text = this.editor.getSelectedText();

    if (!text) {
      text = this.editor.getContent();
    }

    if (!text || text.trim().length === 0) {
      alert('Please select some text or write something in the editor first.');
      return;
    }

    // 显示操作提示
    const actionNames: Record<AIAction, string> = {
      polish: 'Polishing text...',
      expand: 'Expanding text...',
      summarize: 'Summarizing text...',
      tone: 'Adjusting tone...'
    };

    this.addMessage(actionNames[action] || 'Processing...', 'assistant');
    this.addLoadingIndicator();
    this.updateStatus('thinking');

    try {
      const result = await tauriBridge.aiSuggest(text, action);

      this.removeLoadingIndicator();

      // 移除加载消息并显示结果
      if (this.chatMessages.lastChild) {
        this.chatMessages.lastChild.remove();
      }
      this.addMessage(result, 'assistant');

      // 显示应用建议按钮
      this.showApplySuggestion(result);

      this.updateStatus('ready');
    } catch (error) {
      this.removeLoadingIndicator();
      if (this.chatMessages.lastChild) {
        this.chatMessages.lastChild.remove();
      }
      this.addMessage(`Error: ${error}`, 'assistant');
      this.updateStatus('error');
    }
  }

  /**
   * 添加消息
   */
  private addMessage(content: string, role: 'user' | 'assistant'): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;

    if (role === 'assistant') {
      // 简单 Markdown 渲染
      const formattedContent = content
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      messageDiv.innerHTML = formattedContent;
    } else {
      messageDiv.textContent = content;
    }

    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  /**
   * 添加加载指示器
   */
  private addLoadingIndicator(): void {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message assistant loading-dots';
    loadingDiv.innerHTML = '<span></span><span></span><span></span>';
    loadingDiv.id = 'ai-loading';
    this.chatMessages.appendChild(loadingDiv);
    this.scrollToBottom();
  }

  /**
   * 移除加载指示器
   */
  private removeLoadingIndicator(): void {
    const loading = document.getElementById('ai-loading');
    if (loading) loading.remove();
  }

  /**
   * 滚动到底部
   */
  private scrollToBottom(): void {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  /**
   * 显示应用建议按钮
   */
  private showApplySuggestion(suggestion: string): void {
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'flex gap-2 mt-2';

    const applyBtn = document.createElement('button');
    applyBtn.className = 'text-xs font-medium bg-primary text-white px-3 py-1 rounded hover:bg-primary/90';
    applyBtn.textContent = 'Replace Selected';
    applyBtn.onclick = () => this.applySuggestion(suggestion, 'replace');

    const insertBtn = document.createElement('button');
    insertBtn.className = 'text-xs font-medium border border-slate-300 px-3 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700';
    insertBtn.textContent = 'Insert After';
    insertBtn.onclick = () => this.applySuggestion(suggestion, 'insert');

    buttonGroup.appendChild(applyBtn);
    buttonGroup.appendChild(insertBtn);

    this.chatMessages.appendChild(buttonGroup);
    this.scrollToBottom();
  }

  /**
   * 应用建议
   */
  private applySuggestion(suggestion: string, mode: 'replace' | 'insert'): void {
    const editorElement = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    const start = editorElement.selectionStart;
    const end = editorElement.selectionEnd;
    const text = editorElement.value;

    if (mode === 'replace' && start !== end) {
      // 替换选中文本
      editorElement.value = text.substring(0, start) + suggestion + text.substring(end);
    } else {
      // 在光标或末尾插入
      const insertPos = start !== end ? end : text.length;
      editorElement.value = text.substring(0, insertPos) + '\n\n' + suggestion + text.substring(insertPos);
    }

    // 触发更新
    this.editor.setContent(editorElement.value);

    // 移除按钮组
    const lastElement = this.chatMessages.lastElementChild;
    if (lastElement && lastElement.tagName === 'DIV') {
      lastElement.remove();
    }
  }

  /**
   * 更新状态
   */
  private updateStatus(status: 'ready' | 'thinking' | 'error'): void {
    const statusEl = document.getElementById('ai-status');
    if (!statusEl) return;

    const statusTexts: Record<string, string> = {
      ready: '<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>AI Ready',
      thinking: '<span class="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>AI Thinking...',
      error: '<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>AI Error'
    };

    statusEl.innerHTML = statusTexts[status] || statusTexts.ready;
  }
}
