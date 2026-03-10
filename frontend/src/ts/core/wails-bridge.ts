/**
 * Wails API 统一封装
 * 使用 Wails 自动生成的绑定
 */

import type { AIAction, AppConfig, FileInfo } from '../types';

// 导入 Wails 生成的绑定
// @ts-ignore - Wails 生成的模块
import * as App from '../../../wailsjs/go/main/App';
// @ts-ignore - Wails runtime
import { EventsOn, EventsOff } from '../../../wailsjs/runtime/runtime';

// 文件变更事件类型
interface FileChangeEvent {
  kind: string;
  path: string;
}

class WailsBridgeImpl {
  /**
   * 检查 Wails 是否可用
   */
  get available(): boolean {
    return true;
  }

  // ========== 应用操作 ==========

  async getAppDir(): Promise<string> {
    return App.GetAppDir();
  }

  async getDataDir(): Promise<string> {
    return App.GetDataDir();
  }

  async startFileWatcher(path: string): Promise<void> {
    return App.StartFileWatcher(path);
  }

  async stopFileWatcher(): Promise<void> {
    return App.StopFileWatcher();
  }

  /**
   * 监听文件变更事件
   */
  onFileChange(callback: (event: { kind: string; paths: string[] }) => void): () => void {
    EventsOn('file-change', (data: unknown) => {
      const event = data as FileChangeEvent;
      callback({ kind: event.kind, paths: [event.path] });
    });

    return () => {
      EventsOff('file-change');
    };
  }

  // ========== 文件操作 ==========

  async openFile(path: string): Promise<string> {
    return App.OpenFile(path);
  }

  async saveFile(path: string, content: string): Promise<void> {
    return App.SaveFile(path, content);
  }

  async readDirectory(path: string): Promise<FileInfo[]> {
    return App.ReadDirectory(path) as Promise<FileInfo[]>;
  }

  async createFile(path: string): Promise<void> {
    return App.CreateFile(path);
  }

  async deleteFile(path: string): Promise<void> {
    return App.DeleteFile(path);
  }

  async saveFileDialog(defaultName?: string): Promise<string | null> {
    const result = await App.SaveFileDialog(defaultName || '');
    return result || null;
  }

  async openFolderDialog(): Promise<string | null> {
    const result = await App.OpenFolderDialog();
    return result || null;
  }

  // ========== AI 操作 ==========

  async aiChat(message: string, context: string): Promise<string> {
    return App.AIChat(message, context);
  }

  async aiSuggest(text: string, action: AIAction): Promise<string> {
    return App.AISuggest(text, action);
  }

  // ========== 配置操作 ==========

  async getConfig(): Promise<AppConfig> {
    return App.GetConfig() as Promise<AppConfig>;
  }

  async saveConfig(config: AppConfig): Promise<void> {
    // @ts-ignore - Wails 接受普通对象
    return App.SaveConfig(config);
  }

  // ========== 统计操作 ==========

  async countWords(content: string): Promise<number> {
    return App.CountWords(content);
  }

  async countChars(content: string): Promise<number> {
    return App.CountChars(content);
  }
}

// 为了兼容现有代码，导出为 tauriBridge
export const tauriBridge = new WailsBridgeImpl();
export type { WailsBridgeImpl };
