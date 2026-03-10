/**
 * 文件浏览器模块
 */

import type { FileInfo } from '../../types';
import { tauriBridge } from '../../core';
import type { Editor } from '../editor';
import type { App } from '../app';

/**
 * 文件浏览器类
 */
export class FileExplorer {
  private fileTree: HTMLElement;
  private currentPath: string | null = null;
  private currentFilePath: string | null = null;
  private selectedFolderPath: string | null = null;
  private editor: Editor;
  private app: App;
  private unsubscribe: (() => void) | null = null;
  private expandedFolders: Set<string> = new Set();

  constructor(editor: Editor, app: App) {
    this.editor = editor;
    this.app = app;
    this.fileTree = document.getElementById('file-tree') as HTMLElement;
    this.init();
  }

  /**
   * 初始化
   */
  private async init(): Promise<void> {
    // 加载默认笔记目录
    try {
      const dataDir = await tauriBridge.getAppDir();
      if (dataDir) {
        await this.loadDirectory(dataDir);
      } else {
        this.renderEmpty();
      }
    } catch (error) {
      console.error('Failed to load default directory:', error);
      this.renderEmpty();
    }
  }

  /**
   * 渲染空状态提示
   */
  public renderEmpty(): void {
    this.fileTree.innerHTML = `
      <div class="px-4 py-8 text-center">
        <span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">folder_open</span>
        <p class="text-sm text-slate-400 dark:text-slate-500">点击上方按钮打开文件夹</p>
      </div>
    `;
  }

  /**
   * 规范化路径（根据操作系统统一路径分隔符）
   * Windows 使用反斜杠，Unix 使用正斜杠
   */
  private normalizePath(path: string): string {
    // 检测路径中使用的分隔符类型
    const hasBackslash = path.includes('\\');
    const hasForwardSlash = path.includes('/');

    // 如果路径同时包含两种分隔符，或只有正斜杠但看起来像 Windows 路径
    if (hasBackslash) {
      // Windows 路径，统一使用反斜杠
      return path.replace(/\//g, '\\');
    } else if (hasForwardSlash) {
      // Unix 路径，统一使用正斜杠
      return path.replace(/\\/g, '/');
    }
    return path;
  }

  /**
   * 获取路径分隔符
   */
  private getPathSeparator(path: string): string {
    // 检测路径使用的分隔符
    if (path.includes('\\')) {
      return '\\';
    }
    return '/';
  }

  /**
   * 连接路径
   */
  private joinPath(dir: string, name: string): string {
    const separator = this.getPathSeparator(dir);
    // 确保目录不以分隔符结尾
    const normalizedDir = dir.endsWith(separator) ? dir.slice(0, -1) : dir;
    return normalizedDir + separator + name;
  }

  /**
   * 获取父目录
   */
  private getParentDir(path: string): string {
    const normalized = this.normalizePath(path);
    const separator = this.getPathSeparator(normalized);
    const idx = normalized.lastIndexOf(separator);
    return idx > 0 ? normalized.substring(0, idx) : '';
  }

  /**
   * 启动文件监视
   */
  private async startWatching(path: string): Promise<void> {
    // 停止之前的监视
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    try {
      // 启动后端文件监视
      await tauriBridge.startFileWatcher(path);

      // 监听文件变更事件
      this.unsubscribe = tauriBridge.onFileChange((event) => {
        console.log('File change detected:', event);
        this.handleFileChange(event.paths, event.kind);
      });
    } catch (error) {
      console.error('Failed to start file watcher:', error);
    }
  }

  /**
   * 处理文件变更
   */
  private async handleFileChange(changedPaths: string[], kind: string): Promise<void> {
    if (!this.currentPath) return;

    const normalizedCurrentPath = this.normalizePath(this.currentPath);

    for (const changedPath of changedPaths) {
      const normalizedChangedPath = this.normalizePath(changedPath);

      console.log('Checking path:', normalizedChangedPath, 'against current:', normalizedCurrentPath);

      // 检查是否是当前目录或子目录下的变更
      if (!normalizedChangedPath.startsWith(normalizedCurrentPath)) continue;

      // 获取父目录
      const parentDir = this.getParentDir(normalizedChangedPath);
      console.log('Parent dir:', parentDir, 'kind:', kind);

      // 如果变更在根目录下，刷新整个文件树
      if (parentDir === normalizedCurrentPath || parentDir === '') {
        console.log('Refreshing root directory due to change:', normalizedChangedPath);
        await this.loadDirectory(this.currentPath!);
        return;
      }

      // 如果父目录已展开，刷新该文件夹
      if (this.expandedFolders.has(parentDir)) {
        console.log('Refreshing expanded folder:', parentDir);
        await this.refreshFolder(parentDir);
      }
    }
  }

  /**
   * 加载目录
   */
  async loadDirectory(path: string): Promise<void> {
    try {
      const files = await tauriBridge.readDirectory(path);
      this.renderFileTree(files);
      this.currentPath = path;

      // 启动文件监视
      this.startWatching(path);
    } catch (error) {
      console.error('Failed to load directory:', error);
      this.renderError('Failed to load directory');
    }
  }

  /**
   * 渲染文件树
   */
  private renderFileTree(files: FileInfo[]): void {
    this.fileTree.innerHTML = '';

    if (files.length === 0) {
      this.fileTree.innerHTML = '<div class="px-4 py-2 text-sm text-slate-400 dark:text-slate-500">空文件夹</div>';
      return;
    }

    // 排序：文件夹在前，然后按名称排序
    const sortedFiles = [...files].sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    sortedFiles.forEach(file => {
      const item = this.createFileItem(file, 0);
      this.fileTree.appendChild(item);
    });
  }

  /**
   * 创建文件项（支持嵌套）
   */
  private createFileItem(file: FileInfo, level: number): HTMLElement {
    const item = document.createElement('div');
    item.className = 'file-item-wrapper';

    const row = document.createElement('div');
    row.className = 'file-item flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg cursor-pointer';
    row.style.paddingLeft = `${level * 16 + 8}px`;

    const normalizedPath = this.normalizePath(file.path);

    if (file.isDir) {
      const isExpanded = this.expandedFolders.has(normalizedPath);
      row.classList.add('font-medium', 'text-slate-700', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
      row.setAttribute('data-path', normalizedPath);
      row.innerHTML = `
        <span class="material-symbols-outlined text-sm text-slate-400 dark:text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}" data-chevron>${isExpanded ? 'chevron_right' : 'chevron_right'}</span>
        <span class="material-symbols-outlined text-slate-400 dark:text-slate-500" data-folder-icon>${isExpanded ? 'folder_open' : 'folder'}</span>
        <span class="truncate">${file.name}</span>
      `;

      // 子文件夹容器
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'folder-children';
      childrenContainer.setAttribute('data-folder-path', normalizedPath);
      childrenContainer.setAttribute('data-level', String(level + 1));
      childrenContainer.style.display = isExpanded ? 'block' : 'none';

      // 点击展开/折叠并选中文件夹
      row.addEventListener('click', async () => {
        // 选中当前文件夹
        this.selectFolder(normalizedPath, row);

        if (this.expandedFolders.has(normalizedPath)) {
          // 折叠
          this.expandedFolders.delete(normalizedPath);
          childrenContainer.style.display = 'none';
          const chevron = row.querySelector('[data-chevron]') as HTMLElement;
          const folderIcon = row.querySelector('[data-folder-icon') as HTMLElement;
          if (chevron) chevron.classList.remove('rotate-90');
          if (folderIcon) folderIcon.textContent = 'folder';
        } else {
          // 展开
          this.expandedFolders.add(normalizedPath);
          childrenContainer.style.display = 'block';
          const chevron = row.querySelector('[data-chevron]') as HTMLElement;
          const folderIcon = row.querySelector('[data-folder-icon]') as HTMLElement;
          if (chevron) chevron.classList.add('rotate-90');
          if (folderIcon) folderIcon.textContent = 'folder_open';

          // 懒加载子文件夹内容
          if (childrenContainer.children.length === 0) {
            try {
              const children = await tauriBridge.readDirectory(file.path);
              const sortedChildren = [...children].sort((a, b) => {
                if (a.isDir && !b.isDir) return -1;
                if (!a.isDir && b.isDir) return 1;
                return a.name.localeCompare(b.name);
              });
              sortedChildren.forEach(child => {
                childrenContainer.appendChild(this.createFileItem(child, level + 1));
              });
            } catch (error) {
              console.error('Failed to load subdirectory:', error);
            }
          }
        }
      });

      item.appendChild(row);
      item.appendChild(childrenContainer);
    } else {
      row.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
      row.setAttribute('data-path', normalizedPath);
      row.innerHTML = `
        <span class="w-4"></span>
        <span class="material-symbols-outlined text-sm text-slate-400 dark:text-slate-500">description</span>
        <span class="truncate file-name">${file.name}</span>
      `;

      // 高亮当前打开的文件
      if (this.currentFilePath === normalizedPath) {
        row.classList.add('active');
      }

      // 单击打开文件
      row.addEventListener('click', () => this.openFile(file.path, row));

      item.appendChild(row);
    }

    return item;
  }

  /**
   * 打开文件
   */
  async openFile(path: string, row?: HTMLElement): Promise<void> {
    try {
      const content = await tauriBridge.openFile(path);
      this.editor.setContent(content);
      this.app.setCurrentFile(path);
      this.app.updateFileName(path);

      // 记录当前打开的文件
      this.currentFilePath = this.normalizePath(path);

      // 高亮当前文件
      this.highlightCurrentFile(row);
    } catch (error) {
      console.error('Failed to open file:', error);
      alert('Failed to open file: ' + error);
    }
  }

  /**
   * 高亮当前文件
   */
  private highlightCurrentFile(clickedRow?: HTMLElement): void {
    // 移除所有高亮
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));

    if (clickedRow) {
      // 直接使用点击的行
      clickedRow.classList.add('active');
    } else if (this.currentFilePath) {
      // 通过路径查找
      const rows = this.fileTree.querySelectorAll('.file-item');
      for (const row of rows) {
        const path = row.getAttribute('data-path');
        if (path === this.currentFilePath) {
          row.classList.add('active');
          break;
        }
      }
    }
  }

  /**
   * 选中文件夹
   */
  private selectFolder(path: string, row: HTMLElement): void {
    // 清除之前的选中状态
    this.fileTree.querySelectorAll('.file-item.folder-selected').forEach(el => {
      el.classList.remove('folder-selected', 'bg-blue-100', 'dark:bg-blue-900/30');
    });

    // 设置新的选中状态
    this.selectedFolderPath = path;
    row.classList.add('folder-selected', 'bg-blue-100', 'dark:bg-blue-900/30');
  }

  /**
   * 创建新文件
   */
  async createNewFile(): Promise<void> {
    if (!this.currentPath) {
      alert('请先打开一个文件夹');
      return;
    }

    // 确定创建文件的目录：优先使用选中的文件夹，否则使用当前根目录
    const targetDir = this.selectedFolderPath || this.currentPath;

    // 创建临时文件项
    const tempItem = this.createTempFileItem(targetDir);

    // 找到目标文件夹的子项容器，插入到开头
    if (this.selectedFolderPath) {
      // 在选中的文件夹下创建
      const folderContainer = this.fileTree.querySelector(`[data-folder-path="${this.selectedFolderPath}"]`) as HTMLElement;
      if (folderContainer) {
        folderContainer.insertBefore(tempItem, folderContainer.firstChild);
      } else {
        this.fileTree.insertBefore(tempItem, this.fileTree.firstChild);
      }
    } else {
      // 在根目录创建
      this.fileTree.insertBefore(tempItem, this.fileTree.firstChild);
    }

    // 聚焦并选中文件名
    const nameInput = tempItem.querySelector('.file-name-input') as HTMLInputElement;
    nameInput.focus();
    nameInput.select();
  }

  /**
   * 创建临时文件项（用于输入新文件名）
   */
  private createTempFileItem(targetDir: string): HTMLElement {
    const item = document.createElement('div');
    item.className = 'file-item-wrapper';
    item.id = 'temp-file-item';

    const row = document.createElement('div');
    row.className = 'file-item flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg cursor-pointer bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700';

    row.innerHTML = `
      <span class="w-4"></span>
      <span class="material-symbols-outlined text-sm text-blue-500 dark:text-blue-400">description</span>
      <input type="text" class="file-name-input flex-1 bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-300 px-1" value="untitled.md" placeholder="文件名">
      <button class="confirm-btn p-0.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded" title="确认">
        <span class="material-symbols-outlined text-sm text-green-500">check</span>
      </button>
      <button class="cancel-btn p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded" title="取消">
        <span class="material-symbols-outlined text-sm text-red-500">close</span>
      </button>
    `;

    const nameInput = row.querySelector('.file-name-input') as HTMLInputElement;
    const confirmBtn = row.querySelector('.confirm-btn') as HTMLElement;
    const cancelBtn = row.querySelector('.cancel-btn') as HTMLElement;

    // 确认创建
    const confirmCreate = async () => {
      const fileName = nameInput.value.trim();
      if (!fileName) {
        nameInput.focus();
        return;
      }

      // 确保文件名以 .md 结尾
      const finalName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
      const savePath = this.joinPath(targetDir, finalName);

      try {
        await tauriBridge.createFile(savePath);
        // 移除临时项
        item.remove();
        // 打开新文件
        await this.openFile(savePath);
        // 刷新对应的文件夹
        if (this.selectedFolderPath) {
          // 刷新选中的文件夹
          await this.refreshFolder(this.selectedFolderPath);
        } else if (this.currentPath) {
          // 刷新根目录
          await this.loadDirectory(this.currentPath);
        }
      } catch (error) {
        console.error('Failed to create file:', error);
        alert('创建文件失败: ' + error);
      }
    };

    // 取消创建
    const cancelCreate = () => {
      item.remove();
    };

    // 事件绑定
    confirmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmCreate();
    });

    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cancelCreate();
    });

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmCreate();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelCreate();
      }
    });

    // 失焦取消（延迟执行，避免点击按钮时立即触发）
    nameInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.contains(item)) {
          // 检查是否点击了确认或取消按钮
          const activeEl = document.activeElement;
          if (activeEl !== confirmBtn && activeEl !== cancelBtn) {
            // 如果输入了内容则确认，否则取消
            if (nameInput.value.trim()) {
              confirmCreate();
            } else {
              cancelCreate();
            }
          }
        }
      }, 100);
    });

    item.appendChild(row);
    return item;
  }

  /**
   * 刷新指定文件夹（保持展开状态）
   */
  private async refreshFolder(folderPath: string): Promise<void> {
    try {
      const normalizedFolderPath = this.normalizePath(folderPath);

      // 如果是根目录，刷新整个文件树
      if (normalizedFolderPath === this.normalizePath(this.currentPath || '')) {
        await this.loadDirectory(this.currentPath!);
        return;
      }

      // 查找对应的文件夹容器
      const childrenContainer = this.fileTree.querySelector(`[data-folder-path="${normalizedFolderPath}"]`) as HTMLElement;

      if (childrenContainer) {
        // 加载新的子项
        const children = await tauriBridge.readDirectory(folderPath);
        const sortedChildren = [...children].sort((a, b) => {
          if (a.isDir && !b.isDir) return -1;
          if (!a.isDir && b.isDir) return 1;
          return a.name.localeCompare(b.name);
        });

        // 清空并重新渲染子项
        childrenContainer.innerHTML = '';
        const level = parseInt(childrenContainer.getAttribute('data-level') || '1');
        sortedChildren.forEach(child => {
          childrenContainer.appendChild(this.createFileItem(child, level));
        });

        // 重新高亮当前打开的文件
        this.highlightCurrentFile();
      }
    } catch (error) {
      console.error('Failed to refresh folder:', error);
    }
  }

  /**
   * 渲染错误
   */
  private renderError(message: string): void {
    this.fileTree.innerHTML = `
      <div class="px-4 py-2 text-sm text-red-400 dark:text-red-500">
        ${message}
      </div>
    `;
  }
}
