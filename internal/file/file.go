package file

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// FileInfo 文件信息结构
type FileInfo struct {
	Name   string `json:"name"`
	Path   string `json:"path"`
	IsDir  bool   `json:"isDir"`
	Size   int64  `json:"size"`
	ModTime string `json:"modTime"`
}

// Service 文件服务
type Service struct{}

// NewService 创建文件服务
func NewService() *Service {
	return &Service{}
}

// ReadDirectory 读取目录内容
func (s *Service) ReadDirectory(path string) ([]FileInfo, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	// 初始化为空数组，避免返回 null
	files := make([]FileInfo, 0, len(entries))
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		file := FileInfo{
			Name:    entry.Name(),
			Path:    filepath.Join(path, entry.Name()),
			IsDir:   entry.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime().Format("2006-01-02 15:04:05"),
		}
		files = append(files, file)
	}

	// 排序：目录优先，然后按名称排序
	sort.Slice(files, func(i, j int) bool {
		if files[i].IsDir != files[j].IsDir {
			return files[i].IsDir
		}
		return strings.ToLower(files[i].Name) < strings.ToLower(files[j].Name)
	})

	return files, nil
}

// OpenFile 打开并读取文件内容
func (s *Service) OpenFile(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

// SaveFile 保存文件内容
func (s *Service) SaveFile(path, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}

// CreateFile 创建新文件
func (s *Service) CreateFile(path string) error {
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	return file.Close()
}

// DeleteFile 删除文件
func (s *Service) DeleteFile(path string) error {
	return os.Remove(path)
}

// CreateDirectory 创建目录
func (s *Service) CreateDirectory(path string) error {
	return os.MkdirAll(path, 0755)
}

// FileExists 检查文件是否存在
func (s *Service) FileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// GetFileExtension 获取文件扩展名
func (s *Service) GetFileExtension(path string) string {
	return strings.ToLower(filepath.Ext(path))
}

// IsMarkdownFile 检查是否为 Markdown 文件
func (s *Service) IsMarkdownFile(path string) bool {
	ext := s.GetFileExtension(path)
	return ext == ".md" || ext == ".markdown"
}
