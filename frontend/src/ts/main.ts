/**
 * Wails 版本入口
 */

import { Editor } from './modules/editor';
import { AIAssistant } from './modules/ai-assistant';
import { FileExplorer } from './modules/file-explorer';
import { App } from './modules/app';
import { i18n } from './modules/i18n';
import { tauriBridge, container, SERVICES } from './core';

async function bootstrap(): Promise<void> {
  // 等待 DOM 加载
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }

  console.log('Initializing Markdown Studio Pro (Wails mode)...');

  // 注册服务
  container.register(SERVICES.I18N, i18n);
  container.register(SERVICES.TAURI_BRIDGE, tauriBridge);

  // 初始化编辑器
  const editor = new Editor();
  container.register(SERVICES.EDITOR, editor);

  // 初始化应用
  const app = new App(editor, i18n);
  container.register(SERVICES.APP, app);

  // 初始化 AI 助手
  const aiAssistant = new AIAssistant(editor);
  container.register(SERVICES.AI_ASSISTANT, aiAssistant);

  // 初始化文件浏览器
  const fileExplorer = new FileExplorer(editor, app);
  container.register(SERVICES.FILE_EXPLORER, fileExplorer);

  // 设置文件浏览器引用到 App（用于打开文件夹功能）
  app.setFileExplorer(fileExplorer);

  // 初始化语言
  i18n.updatePageLanguage();

  // 暴露到全局（调试用）
  if (typeof window !== 'undefined') {
    const win = window as unknown as Record<string, unknown>;
    win.editor = editor;
    win.app = app;
    win.ai = aiAssistant;
    win.fileExplorer = fileExplorer;
    win.t = (key: string) => i18n.t(key as never);
  }

  console.log('Markdown Studio Pro initialized successfully');
}

// 启动应用
bootstrap().catch(error => {
  console.error('Failed to initialize app:', error);
});
