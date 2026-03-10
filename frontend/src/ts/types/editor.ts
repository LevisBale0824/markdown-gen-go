/**
 * 编辑器相关类型定义
 */

export type FormatType = 'bold' | 'italic' | 'ul' | 'ol' | 'link' | 'image' | 'code';

export interface EditorState {
  content: string;
  hasUnsavedChanges: boolean;
  currentFilePath: string | null;
}

export interface EditorElements {
  editor: HTMLTextAreaElement;
  preview: HTMLElement;
  previewContainer: HTMLElement;
  editorContainer: HTMLElement;
}

export interface TextSelection {
  start: number;
  end: number;
  selectedText: string;
}
