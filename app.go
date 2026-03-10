package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx         context.Context
	fileWatcher *FileWatcher
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetDataDir 获取笔记存储目录（安装目录下的 notes 文件夹）
func (a *App) GetDataDir() string {
	// 获取当前可执行文件所在目录（安装目录）
	execPath, err := os.Executable()
	if err != nil {
		// 如果获取失败，使用当前工作目录
		execPath = "."
	}

	// 获取安装目录
	installDir := filepath.Dir(execPath)

	// 在安装目录下创建 notes 文件夹
	dataDir := filepath.Join(installDir, "notes")

	// 确保目录存在
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		// 如果创建失败，使用当前目录下的 notes
		return filepath.Join(".", "notes")
	}

	return dataDir
}

// GetAppDir 获取应用目录（兼容旧接口）
func (a *App) GetAppDir() string {
	return a.GetDataDir()
}

// SaveFileDialog 保存文件对话框
func (a *App) SaveFileDialog(defaultName string) (string, error) {
	result, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: defaultName,
		Filters: []runtime.FileFilter{
			{DisplayName: "Markdown Files (*.md)", Pattern: "*.md"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	return result, err
}

// OpenFolderDialog 打开文件夹对话框
func (a *App) OpenFolderDialog() (string, error) {
	result, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择文件夹",
	})
	return result, err
}

// OpenFileDialog 打开文件对话框
func (a *App) OpenFileDialog() (string, error) {
	result, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Filters: []runtime.FileFilter{
			{DisplayName: "Markdown Files (*.md)", Pattern: "*.md"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
	return result, err
}

// CountWords 统计字数
func (a *App) CountWords(content string) int {
	// 简单的字数统计（支持中英文）
	content = strings.TrimSpace(content)
	if content == "" {
		return 0
	}

	// 统计中文字符
	chineseCount := 0
	for _, r := range content {
		if r >= 0x4e00 && r <= 0x9fff {
			chineseCount++
		}
	}

	// 统计英文单词
	words := strings.Fields(content)
	englishCount := len(words)

	// 如果有中文，中文字符数 + 英文单词数
	if chineseCount > 0 {
		return chineseCount + englishCount
	}
	return englishCount
}

// CountChars 统计字符数
func (a *App) CountChars(content string) int {
	return len([]rune(content))
}
