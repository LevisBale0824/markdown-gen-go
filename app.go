package main

import (
	"context"
	"os"
	"path/filepath"
	runtimelib "runtime"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"markdown-gen-go/internal/ai"
	"markdown-gen-go/internal/config"
	"markdown-gen-go/internal/file"
	"markdown-gen-go/internal/watcher"
)

// App struct
type App struct {
	ctx          context.Context
	configSvc    *config.Service
	fileSvc      *file.Service
	aiSvc        *ai.Service
	watcherSvc   *watcher.Service
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		configSvc:  config.NewService(),
		fileSvc:    file.NewService(),
		watcherSvc: watcher.NewService(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetDataDir 获取笔记存储目录
// Windows: 安装目录下的 notes 文件夹
// Linux/macOS: ~/.local/share/markdown-gen-go/notes 或 XDG_DATA_HOME
func (a *App) GetDataDir() string {
	var dataDir string

	if runtimelib.GOOS == "windows" {
		// Windows: 使用安装目录下的 notes 文件夹
		execPath, err := os.Executable()
		if err != nil {
			execPath = "."
		}
		installDir := filepath.Dir(execPath)
		dataDir = filepath.Join(installDir, "notes")
	} else {
		// Linux/macOS: 使用用户数据目录
		// 优先使用 XDG_DATA_HOME 环境变量
		xdgDataHome := os.Getenv("XDG_DATA_HOME")
		if xdgDataHome != "" {
			dataDir = filepath.Join(xdgDataHome, "markdown-gen-go", "notes")
		} else {
			// 默认使用 ~/.local/share
			homeDir, err := os.UserHomeDir()
			if err != nil {
				homeDir = "."
			}
			dataDir = filepath.Join(homeDir, ".local", "share", "markdown-gen-go", "notes")
		}
	}

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

// ========== 文件操作（代理到 file.Service） ==========

// FileInfo 文件信息（导出给前端）
type FileInfo = file.FileInfo

// ReadDirectory 读取目录内容
func (a *App) ReadDirectory(path string) ([]FileInfo, error) {
	return a.fileSvc.ReadDirectory(path)
}

// OpenFile 打开并读取文件内容
func (a *App) OpenFile(path string) (string, error) {
	return a.fileSvc.OpenFile(path)
}

// SaveFile 保存文件内容
func (a *App) SaveFile(path, content string) error {
	return a.fileSvc.SaveFile(path, content)
}

// CreateFile 创建新文件
func (a *App) CreateFile(path string) error {
	return a.fileSvc.CreateFile(path)
}

// DeleteFile 删除文件
func (a *App) DeleteFile(path string) error {
	return a.fileSvc.DeleteFile(path)
}

// CreateDirectory 创建目录
func (a *App) CreateDirectory(path string) error {
	return a.fileSvc.CreateDirectory(path)
}

// FileExists 检查文件是否存在
func (a *App) FileExists(path string) bool {
	return a.fileSvc.FileExists(path)
}

// GetFileExtension 获取文件扩展名
func (a *App) GetFileExtension(path string) string {
	return a.fileSvc.GetFileExtension(path)
}

// IsMarkdownFile 检查是否为 Markdown 文件
func (a *App) IsMarkdownFile(path string) bool {
	return a.fileSvc.IsMarkdownFile(path)
}

// ========== 配置操作（代理到 config.Service） ==========

// AIConfig AI 配置（导出给前端）
type AIConfig = config.AIConfig

// AppConfig 应用配置（导出给前端）
type AppConfig = config.AppConfig

// GetConfigPath 获取配置文件路径
func (a *App) GetConfigPath() string {
	return a.configSvc.GetConfigPath()
}

// GetConfig 获取配置
func (a *App) GetConfig() AppConfig {
	return a.configSvc.Get()
}

// SaveConfig 保存配置
func (a *App) SaveConfig(config AppConfig) error {
	return a.configSvc.Save(config)
}

// UpdateLastDir 更新最后访问的目录
func (a *App) UpdateLastDir(dir string) error {
	return a.configSvc.UpdateLastDir(dir)
}

// UpdateAIConfig 更新 AI 配置
func (a *App) UpdateAIConfig(aiConfig AIConfig) error {
	return a.configSvc.UpdateAIConfig(aiConfig)
}

// ========== AI 操作（代理到 ai.Service） ==========

// AIChat AI 聊天
func (a *App) AIChat(message, context string) (string, error) {
	cfg := a.GetConfig()
	svc := ai.NewService(ai.Config{
		APIKey:      cfg.AI.APIKey,
		APIEndpoint: cfg.AI.APIEndpoint,
		Model:       cfg.AI.Model,
		MaxTokens:   cfg.AI.MaxTokens,
	})
	return svc.Chat(message, context)
}

// AISuggest AI 建议
func (a *App) AISuggest(text, action string) (string, error) {
	cfg := a.GetConfig()
	svc := ai.NewService(ai.Config{
		APIKey:      cfg.AI.APIKey,
		APIEndpoint: cfg.AI.APIEndpoint,
		Model:       cfg.AI.Model,
		MaxTokens:   cfg.AI.MaxTokens,
	})
	return svc.Suggest(text, action)
}

// ========== 文件监视（代理到 watcher.Service） ==========

// FileChangeEvent 文件变更事件（导出给前端）
type FileChangeEvent = watcher.FileChangeEvent

// StartFileWatcher 启动文件监视
func (a *App) StartFileWatcher(path string) error {
	return a.watcherSvc.Start(path, func(event FileChangeEvent) {
		runtime.EventsEmit(a.ctx, "file-change", event)
	})
}

// StopFileWatcher 停止文件监视
func (a *App) StopFileWatcher() {
	a.watcherSvc.Stop()
}
