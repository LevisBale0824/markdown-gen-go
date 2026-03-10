package watcher

import (
	"os"
	"path/filepath"
	"sync"

	"github.com/fsnotify/fsnotify"
)

// FileChangeEvent 文件变更事件
type FileChangeEvent struct {
	Kind string `json:"kind"` // "create", "write", "remove", "rename"
	Path string `json:"path"`
}

// Service 文件监视服务
type Service struct {
	watcher   *fsnotify.Watcher
	mu        sync.Mutex
	isRunning bool
	watched   map[string]bool
	callback  func(event FileChangeEvent)
}

// NewService 创建文件监视服务
func NewService() *Service {
	return &Service{
		watched: make(map[string]bool),
	}
}

// Start 开始监视目录
func (s *Service) Start(path string, callback func(event FileChangeEvent)) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.isRunning {
		if s.watcher != nil {
			s.watcher.Close()
		}
		s.watched = make(map[string]bool)
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}

	s.watcher = watcher
	s.isRunning = true
	s.callback = callback

	// 递归添加目录监视
	if err := s.addWatchRecursive(path); err != nil {
		watcher.Close()
		return err
	}

	// 启动事件处理协程
	go s.handleEvents()

	return nil
}

// addWatchRecursive 递归添加目录监视
func (s *Service) addWatchRecursive(rootPath string) error {
	err := filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			if err := s.watcher.Add(path); err != nil {
				return nil
			}
			s.watched[path] = true
		}
		return nil
	})
	return err
}

// Stop 停止监视
func (s *Service) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.watcher != nil {
		s.watcher.Close()
		s.watcher = nil
	}
	s.isRunning = false
	s.watched = make(map[string]bool)
}

// handleEvents 处理文件系统事件
func (s *Service) handleEvents() {
	for {
		select {
		case event, ok := <-s.watcher.Events:
			if !ok {
				return
			}

			var kind string
			switch {
			case event.Op&fsnotify.Create == fsnotify.Create:
				kind = "create"
				// 如果是新创建的目录，需要添加监视
				if info, err := os.Stat(event.Name); err == nil && info.IsDir() {
					s.mu.Lock()
					if !s.watched[event.Name] {
						s.watcher.Add(event.Name)
						s.watched[event.Name] = true
					}
					s.mu.Unlock()
				}
			case event.Op&fsnotify.Write == fsnotify.Write:
				kind = "write"
			case event.Op&fsnotify.Remove == fsnotify.Remove:
				kind = "remove"
				s.mu.Lock()
				delete(s.watched, event.Name)
				s.mu.Unlock()
			case event.Op&fsnotify.Rename == fsnotify.Rename:
				kind = "rename"
				s.mu.Lock()
				delete(s.watched, event.Name)
				s.mu.Unlock()
			default:
				continue
			}

			// 调用回调函数
			if s.callback != nil {
				s.callback(FileChangeEvent{
					Kind: kind,
					Path: event.Name,
				})
			}

		case _, ok := <-s.watcher.Errors:
			if !ok {
				return
			}
		}
	}
}
