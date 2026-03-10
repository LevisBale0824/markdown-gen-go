package main

import (
	"sync"

	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// FileWatcher 文件监视器
type FileWatcher struct {
	watcher   *fsnotify.Watcher
	mu        sync.Mutex
	isRunning bool
}

// FileChangeEvent 文件变更事件
type FileChangeEvent struct {
	Kind string   `json:"kind"` // "create", "write", "remove", "rename"
	Path string   `json:"path"`
}

// NewFileWatcher 创建文件监视器
func NewFileWatcher() *FileWatcher {
	return &FileWatcher{}
}

// StartWatching 开始监视目录
func (fw *FileWatcher) StartWatching(app *App, path string) error {
	fw.mu.Lock()
	defer fw.mu.Unlock()

	if fw.isRunning {
		if fw.watcher != nil {
			fw.watcher.Close()
		}
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}

	fw.watcher = watcher
	fw.isRunning = true

	// 添加目录监视
	if err := fw.addWatchRecursive(path); err != nil {
		watcher.Close()
		return err
	}

	// 启动事件处理协程
	go fw.handleEvents(app)

	return nil
}

// addWatchRecursive 递归添加目录监视
func (fw *FileWatcher) addWatchRecursive(path string) error {
	return fw.watcher.Add(path)
}

// StopWatching 停止监视
func (fw *FileWatcher) StopWatching() {
	fw.mu.Lock()
	defer fw.mu.Unlock()

	if fw.watcher != nil {
		fw.watcher.Close()
		fw.watcher = nil
	}
	fw.isRunning = false
}

// handleEvents 处理文件系统事件
func (fw *FileWatcher) handleEvents(app *App) {
	for {
		select {
		case event, ok := <-fw.watcher.Events:
			if !ok {
				return
			}

			var kind string
			switch {
			case event.Op&fsnotify.Create == fsnotify.Create:
				kind = "create"
			case event.Op&fsnotify.Write == fsnotify.Write:
				kind = "write"
			case event.Op&fsnotify.Remove == fsnotify.Remove:
				kind = "remove"
			case event.Op&fsnotify.Rename == fsnotify.Rename:
				kind = "rename"
			default:
				continue
			}

			// 发送事件到前端
			changeEvent := FileChangeEvent{
				Kind: kind,
				Path: event.Name,
			}
			runtime.EventsEmit(app.ctx, "file-change", changeEvent)

		case err, ok := <-fw.watcher.Errors:
			if !ok {
				return
			}
			runtime.LogError(app.ctx, "File watcher error: "+err.Error())
		}
	}
}

// StartFileWatcher 启动文件监视（应用方法）
func (a *App) StartFileWatcher(path string) error {
	if a.fileWatcher == nil {
		a.fileWatcher = NewFileWatcher()
	}
	return a.fileWatcher.StartWatching(a, path)
}

// StopFileWatcher 停止文件监视（应用方法）
func (a *App) StopFileWatcher() {
	if a.fileWatcher != nil {
		a.fileWatcher.StopWatching()
	}
}
