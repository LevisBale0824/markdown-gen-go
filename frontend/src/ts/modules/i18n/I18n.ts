/**
 * 国际化管理类
 */

import type { Language, TranslationKey } from '../../types';
import { translations } from './translations';

type LanguageChangeListener = (lang: Language) => void;

export class I18n {
  private currentLanguage: Language = 'zh';
  private listeners: Set<LanguageChangeListener> = new Set();

  constructor() {
    this.loadPreference();
  }

  /**
   * 获取翻译文本
   */
  t(key: TranslationKey): string {
    return translations[this.currentLanguage][key] || key;
  }

  /**
   * 获取当前语言
   */
  getLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * 设置语言
   */
  setLanguage(lang: Language): void {
    if (lang !== this.currentLanguage) {
      this.currentLanguage = lang;
      this.savePreference(lang);
      this.updatePageLanguage();
      this.notifyListeners();
    }
  }

  /**
   * 订阅语言变化
   */
  subscribe(listener: LanguageChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 更新页面语言
   */
  updatePageLanguage(): void {
    const t = this.t.bind(this);

    // 顶部导航
    this.updateText('btn-file', t('file'));
    this.updateText('btn-settings', t('settings'));

    // 工具栏按钮
    this.updateAttribute('btn-bold', 'title', t('bold') + ' (Ctrl+B)');
    this.updateAttribute('btn-italic', 'title', t('italic') + ' (Ctrl+I)');
    this.updateAttribute('btn-ul', 'title', t('bulletList'));
    this.updateAttribute('btn-ol', 'title', t('numberedList'));
    this.updateAttribute('btn-link', 'title', t('link'));
    this.updateAttribute('btn-image', 'title', t('image'));
    this.updateAttribute('btn-code', 'title', t('code'));

    // 左侧边栏
    this.updateText('explorer-title', t('explorer'));
    this.updateAttribute('btn-open-folder', 'title', t('openFolder'));
    this.updateText('new-file-text', t('newFile'));

    // 预览/保存按钮
    this.updateText('preview-text', t('previewButton'));
    this.updateText('save-text', t('saveButton'));

    // AI 助手
    this.updateText('ai-assistant-title', t('aiAssistant'));
    this.updateText('ai-polish', t('polish'));
    this.updateText('ai-expand', t('expand'));
    this.updateText('ai-summarize', t('summarize'));
    this.updateText('ai-tone', t('tone'));

    // AI 输入框
    const aiInput = document.getElementById('ai-input') as HTMLTextAreaElement | null;
    if (aiInput) aiInput.placeholder = t('chatPlaceholder');

    // 聊天欢迎消息
    this.updateText('chat-welcome-message', t('chatWelcomeMessage'));

    // 编辑器占位符
    const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement | null;
    if (editor) editor.placeholder = t('editorPlaceholder');

    // AI 面板底部文字
    this.updateText('ai-footer-text', t('aiFooter'));

    // 状态栏
    this.updateHtml('save-status',
      '<span class="material-symbols-outlined text-xs">done_all</span>' + t('allChangesSaved')
    );
    this.updateText('current-file', t('untitledWithExt'));
    this.updateText('word-count', t('wordCount'));
    this.updateText('char-count', t('charCount'));
    this.updateHtml('ai-status',
      '<span class="w-1.5 h-1.5 rounded-full bg-primary"></span>' + t('aiReady')
    );

    // 设置弹窗
    this.updateText('settings-title', t('settingsTitle'));
    this.updateText('btn-cancel', t('cancel'));
    this.updateText('btn-save-settings', t('save'));

    // 设置标签
    this.updateLabel('label-ai-provider', t('aiProvider'));
    this.updateLabel('label-api-key', t('apiKey'));
    this.updateLabel('label-api-endpoint', t('apiEndpoint'));
    this.updateLabel('label-model', t('model'));
    this.updateLabel('label-theme', t('theme'));
    this.updateLabel('label-language', t('language'));

    // 自定义主题标签
    this.updateText('custom-theme-title', t('customThemeColors'));
    this.updateLabel('label-bg-color', t('backgroundColor'));
    this.updateLabel('label-text-color', t('textColor'));
    this.updateLabel('label-accent-color', t('accentColor'));
    this.updateLabel('label-border-color', t('borderColor'));
    this.updateLabel('label-code-bg-color', t('codeBgColor'));
    this.updateLabel('label-secondary-bg-color', t('secondaryBgColor'));
    this.updateLabel('label-muted-text-color', t('mutedTextColor'));

    // 设置选项
    this.updateSelectOption('ai-provider', 'glm', t('glmProvider'));
    this.updateSelectOption('ai-provider', 'openai', t('openaiProvider'));
    this.updateSelectOption('app-theme', 'dark', t('darkTheme'));
    this.updateSelectOption('app-theme', 'light', t('lightTheme'));
    this.updateSelectOption('app-theme', 'custom', t('customTheme'));
    this.updateSelectOption('app-language', 'zh', t('chinese'));
    this.updateSelectOption('app-language', 'en', t('english'));

    // 占位符
    this.updatePlaceholder('ai-api-key', t('enterApiKey'));
    this.updatePlaceholder('ai-endpoint', t('apiEndpointPlaceholder'));
    this.updatePlaceholder('ai-model', t('modelPlaceholder'));

    // 更新当前语言选择
    const languageSelect = document.getElementById('app-language') as HTMLSelectElement | null;
    if (languageSelect) {
      languageSelect.value = this.currentLanguage;
    }

    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: this.currentLanguage } }));
  }

  // ========== 私有方法 ==========

  private loadPreference(): void {
    const saved = localStorage.getItem('app-language');
    if (saved === 'zh' || saved === 'en') {
      this.currentLanguage = saved;
    }
  }

  private savePreference(lang: Language): void {
    localStorage.setItem('app-language', lang);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentLanguage));
  }

  private updateText(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  private updateHtml(id: string, html: string): void {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  private updateAttribute(id: string, attr: string, value: string): void {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) el.setAttribute(attr, value);
  }

  private updateLabel(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  private updatePlaceholder(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.setAttribute('placeholder', text);
  }

  private updateSelectOption(selectId: string, value: string, text: string): void {
    const select = document.getElementById(selectId);
    if (select) {
      const option = select.querySelector(`option[value="${value}"]`);
      if (option) option.textContent = text;
    }
  }
}

// 创建全局实例
export const i18n = new I18n();
