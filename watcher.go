package main

import (
	"os"
	"path/filepath"
	"sync"

	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// FileWatcher 文件监视器
type FileWatcher struct {
	watcher   *fsnotify.Watcher
	mu        sync.Mutex
	isRunning bool
	watched   map[string]bool // 已监视的目录
}

// FileChangeEvent 文件变更事件
type FileChangeEvent struct {
	Kind string `json:"kind"` // "create", "write", "remove", "rename"
	Path string `json:"path"`
}

// NewFileWatcher 创建文件监视器
func NewFileWatcher() *FileWatcher {
	return &FileWatcher{
		watched: make(map[string]bool),
	}
}

// StartWatching 开始监视目录
func (fw *FileWatcher) StartWatching(app *App, path string) error {
	fw.mu.Lock()
	defer fw.mu.Unlock()

	if fw.isRunning {
		if fw.watcher != nil {
			fw.watcher.Close()
		}
		fw.watched = make(map[string]bool)
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}

	fw.watcher = watcher
	fw.isRunning = true

	// 递归添加目录监视
	if err := fw.addWatchRecursive(path); err != nil {
		watcher.Close()
		return err
	}

	// 启动事件处理协程
	go fw.handleEvents(app)

	return nil
}

// addWatchRecursive 递归添加目录监视
func (fw *FileWatcher) addWatchRecursive(rootPath string) error {
	// 遍历目录树，添加所有子目录
	err := filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // 忽略错误，继续遍历
		}
		if info.IsDir() {
			if err := fw.watcher.Add(path); err != nil {
				return nil // 忽略单个目录的错误
			}
			fw.watched[path] = true
		}
		return nil
	})
	return err
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
	fw.watched = make(map[string]bool)
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
				// 如果是新创建的目录，需要添加监视
				if info, err := os.Stat(event.Name); err == nil && info.IsDir() {
					fw.mu.Lock()
					if !fw.watched[event.Name] {
						fw.watcher.Add(event.Name)
						fw.watched[event.Name] = true
					}
					fw.mu.Unlock()
				}
			case event.Op&fsnotify.Write == fsnotify.Write:
				kind = "write"
			case event.Op&fsnotify.Remove == fsnotify.Remove:
				kind = "remove"
				// 如果是目录被删除，从监视列表中移除
				fw.mu.Lock()
				delete(fw.watched, event.Name)
				fw.mu.Unlock()
			case event.Op&fsnotify.Rename == fsnotify.Rename:
				kind = "rename"
				// 重命名通常会导致删除和创建两个事件
				fw.mu.Lock()
				delete(fw.watched, event.Name)
				fw.mu.Unlock()
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
