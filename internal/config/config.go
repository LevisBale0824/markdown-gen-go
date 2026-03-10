package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	runtimelib "runtime"
)

// AIConfig AI 配置
type AIConfig struct {
	Provider    string `json:"provider"`
	APIKey      string `json:"apiKey"`
	APIEndpoint string `json:"apiEndpoint"`
	Model       string `json:"model"`
	MaxTokens   int    `json:"maxTokens"`
}

// AppConfig 应用配置
type AppConfig struct {
	AI      AIConfig `json:"ai"`
	Theme   string   `json:"theme"`
	LastDir string   `json:"lastDir"`
}

// DefaultConfig 返回默认配置
func DefaultConfig() AppConfig {
	return AppConfig{
		AI: AIConfig{
			Provider:    "glm",
			APIKey:      "",
			APIEndpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
			Model:       "glm-4-flash",
			MaxTokens:   4096,
		},
		Theme:   "light",
		LastDir: "",
	}
}

// Service 配置服务
type Service struct {
	configPath string
}

// NewService 创建配置服务
func NewService() *Service {
	return &Service{
		configPath: GetConfigPath(),
	}
}

// GetConfigPath 获取配置文件路径
// Windows: 安装目录下的 config 文件夹
// Linux/macOS: ~/.config/markdown-gen-go/ 或 XDG_CONFIG_HOME
func GetConfigPath() string {
	var configDir string

	if runtimelib.GOOS == "windows" {
		// Windows: 使用安装目录下的 config 文件夹
		execPath, err := os.Executable()
		if err != nil {
			execPath = "."
		}
		installDir := filepath.Dir(execPath)
		configDir = filepath.Join(installDir, "config")
	} else {
		// Linux/macOS: 使用用户配置目录
		// 优先使用 XDG_CONFIG_HOME 环境变量
		xdgConfigHome := os.Getenv("XDG_CONFIG_HOME")
		if xdgConfigHome != "" {
			configDir = filepath.Join(xdgConfigHome, "markdown-gen-go")
		} else {
			// 默认使用 ~/.config
			homeDir, err := os.UserHomeDir()
			if err != nil {
				homeDir = "."
			}
			configDir = filepath.Join(homeDir, ".config", "markdown-gen-go")
		}
	}

	// 确保目录存在
	if err := os.MkdirAll(configDir, 0755); err != nil {
		// 如果创建失败，使用当前目录下的 config
		configDir = filepath.Join(".", "config")
	}

	return filepath.Join(configDir, "config.json")
}

// Get 获取配置
func (s *Service) Get() AppConfig {
	data, err := os.ReadFile(s.configPath)
	if err != nil {
		// 配置文件不存在，返回默认配置并保存
		config := DefaultConfig()
		s.Save(config)
		return config
	}

	var config AppConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return DefaultConfig()
	}

	return config
}

// Save 保存配置
func (s *Service) Save(config AppConfig) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.configPath, data, 0644)
}

// UpdateLastDir 更新最后访问的目录
func (s *Service) UpdateLastDir(dir string) error {
	config := s.Get()
	config.LastDir = dir
	return s.Save(config)
}

// UpdateAIConfig 更新 AI 配置
func (s *Service) UpdateAIConfig(aiConfig AIConfig) error {
	config := s.Get()
	config.AI = aiConfig
	return s.Save(config)
}
