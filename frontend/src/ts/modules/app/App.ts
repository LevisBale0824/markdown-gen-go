/**
 * 应用主模块
 */

import type { AppConfig, ThemeType, CustomTheme, AppSettings } from '../../types';
import { tauriBridge } from '../../core';
import { DEFAULT_APP_CONFIG, DEFAULT_CUSTOM_THEME } from '../../types';
import { Editor } from '../editor';
import type { I18n } from '../i18n';
import type { FileExplorer } from '../file-explorer';

/**
 * 应用类
 */
export class App {
  private config: AppSettings;
  private currentFile: string | null = null;
  private editor: Editor;
  private fileExplorer: FileExplorer | null = null;

  constructor(editor: Editor, _i18n: I18n) {
    this.editor = editor;
    // i18n is kept for future use (language-aware notifications, etc.)
    this.config = this.getDefaultConfig();
    this.init();
  }

  /**
   * 设置文件浏览器引用
   */
  setFileExplorer(fileExplorer: FileExplorer): void {
    this.fileExplorer = fileExplorer;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): AppSettings {
    return {
      ...DEFAULT_APP_CONFIG,
      language: 'zh',
      customTheme: { ...DEFAULT_CUSTOM_THEME }
    };
  }

  /**
   * 初始化
   */
  private async init(): Promise<void> {
    await this.loadConfig();
    this.applyTheme();
    this.setupKeyboardShortcuts();

    // 设置编辑器保存回调
    this.editor.onSaveFile(() => this.saveCurrentFile());
  }

  /**
   * 加载配置
   */
  private async loadConfig(): Promise<void> {
    try {
      if (tauriBridge.available) {
        const config = await tauriBridge.getConfig();
        this.config = { ...this.getDefaultConfig(), ...config };
      } else {
        // 浏览器模式：从 localStorage 加载
        const saved = localStorage.getItem('markdown-studio-config');
        if (saved) {
          this.config = { ...this.config, ...JSON.parse(saved) };
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }

  /**
   * 获取配置
   */
  getConfig(): AppSettings {
    return { ...this.config };
  }

  /**
   * 设置当前文件
   */
  setCurrentFile(path: string): void {
    this.currentFile = path;
  }

  /**
   * 应用主题
   */
  private applyTheme(): void {
    const html = document.documentElement;
    const theme = this.config.theme as ThemeType;

    // 移除所有主题类
    html.classList.remove('dark', 'light', 'custom');

    if (theme === 'dark') {
      html.classList.add('dark');
    } else if (theme === 'light') {
      html.classList.add('light');
    } else if (theme === 'custom' && this.config.customTheme) {
      html.classList.add('custom');
      this.applyCustomTheme(this.config.customTheme);
    }
  }

  /**
   * 应用自定义主题
   */
  private applyCustomTheme(theme: CustomTheme): void {
    const root = document.documentElement;
    root.style.setProperty('--bg-color', theme.backgroundColor);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--border-color', theme.borderColor);
    root.style.setProperty('--code-bg', theme.codeBackgroundColor);
    root.style.setProperty('--secondary-bg', theme.secondaryBackgroundColor);
    root.style.setProperty('--muted-text', theme.mutedTextColor);
  }

  /**
   * 打开设置
   */
  async openSettings(): Promise<void> {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    // 填充当前配置
    const providerEl = document.getElementById('ai-provider') as HTMLSelectElement;
    const apiKeyEl = document.getElementById('ai-api-key') as HTMLInputElement;
    const endpointEl = document.getElementById('ai-endpoint') as HTMLInputElement;
    const modelEl = document.getElementById('ai-model') as HTMLInputElement;
    const themeEl = document.getElementById('app-theme') as HTMLSelectElement;

    if (providerEl) providerEl.value = this.config.ai.provider;
    if (apiKeyEl) apiKeyEl.value = this.config.ai.apiKey;
    if (endpointEl) endpointEl.value = this.config.ai.apiEndpoint;
    if (modelEl) modelEl.value = this.config.ai.model;
    if (themeEl) themeEl.value = this.config.theme;

    modal.classList.remove('hidden');
  }

  /**
   * 关闭设置
   */
  closeSettings(): void {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /**
   * 保存设置
   */
  async saveSettings(): Promise<void> {
    const providerEl = document.getElementById('ai-provider') as HTMLSelectElement;
    const apiKeyEl = document.getElementById('ai-api-key') as HTMLInputElement;
    const endpointEl = document.getElementById('ai-endpoint') as HTMLInputElement;
    const modelEl = document.getElementById('ai-model') as HTMLInputElement;
    const themeEl = document.getElementById('app-theme') as HTMLSelectElement;

    const newConfig: AppConfig = {
      ai: {
        provider: providerEl?.value || 'glm',
        apiKey: apiKeyEl?.value || '',
        apiEndpoint: endpointEl?.value || '',
        model: modelEl?.value || 'glm-4-flash',
        maxTokens: 4096
      },
      theme: themeEl?.value || 'dark',
      lastDir: this.config.lastDir
    };

    try {
      if (tauriBridge.available) {
        await tauriBridge.saveConfig(newConfig);
      } else {
        // 浏览器模式：保存到 localStorage
        localStorage.setItem('markdown-studio-config', JSON.stringify(newConfig));
      }

      this.config = { ...this.config, ...newConfig };
      this.applyTheme();
      this.closeSettings();
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings: ' + error);
    }
  }

  /**
   * 设置键盘快捷键
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl+S 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.editor.saveFile();
      }
      // Ctrl+B 粗体
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        this.editor.insertFormat('bold');
      }
      // Ctrl+I 斜体
      if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        this.editor.insertFormat('italic');
      }
      // Ctrl+O 打开文件
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        this.openFile();
      }
      // Ctrl+N 新建文件
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        this.createNewFile();
      }
      // Escape 关闭弹窗
      if (e.key === 'Escape') {
        this.closeSettings();
      }
    });
  }

  /**
   * 打开文件
   */
  async openFile(): Promise<void> {
    try {
      const path = prompt('Enter file path to open:', 'C:\\Users\\Min\\Documents\\example.md');

      if (path) {
        const content = await tauriBridge.openFile(path);
        this.editor.setContent(content);
        this.currentFile = path;
        this.updateFileName(path);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      alert('Failed to open file: ' + error);
    }
  }

  /**
   * 保存当前文件
   */
  async saveCurrentFile(): Promise<void> {
    const content = this.editor.getContent();

    if (this.currentFile) {
      try {
        await tauriBridge.saveFile(this.currentFile, content);
        this.editor.markAsSaved();
        this.editor.showToast('File saved successfully', 'success');
      } catch (error) {
        console.error('Failed to save file:', error);
        this.editor.showToast('Failed to save file', 'error');
      }
    } else {
      // 另存为
      try {
        const savePath = prompt('Enter file path to save:', 'C:\\Users\\Min\\Documents\\untitled.md');

        if (savePath) {
          await tauriBridge.saveFile(savePath, content);
          this.currentFile = savePath;
          this.updateFileName(savePath);
          this.editor.markAsSaved();
          this.editor.showToast('File saved successfully', 'success');
        }
      } catch (error) {
        console.error('Failed to save file:', error);
        this.editor.showToast('Failed to save file', 'error');
      }
    }
  }

  /**
   * 更新文件名显示
   */
  updateFileName(path: string): void {
    const fileName = path.split(/[/\\]/).pop();
    const el = document.getElementById('current-file');
    if (el) {
      el.textContent = fileName || 'Untitled.md';
    }
  }

  /**
   * 创建新文件
   */
  createNewFile(): void {
    this.currentFile = null;
    this.editor.setContent('');
    const el = document.getElementById('current-file');
    if (el) {
      el.textContent = 'Untitled.md';
    }
  }

  /**
   * 打开文件夹
   */
  async openFolder(): Promise<void> {
    try {
      const folderPath = await tauriBridge.openFolderDialog();
      if (folderPath && this.fileExplorer) {
        await this.fileExplorer.loadDirectory(folderPath);
        // 更新配置中的 lastDir
        this.config.lastDir = folderPath;
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
      alert('Failed to open folder: ' + error);
    }
  }
}
