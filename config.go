package main

import (
	"encoding/json"
	"os"
	"path/filepath"
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

// GetConfigPath 获取配置文件路径
func (a *App) GetConfigPath() string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	appDir := filepath.Join(configDir, "markdown-gen-go")
	os.MkdirAll(appDir, 0755)
	return filepath.Join(appDir, "config.json")
}

// GetConfig 获取配置
func (a *App) GetConfig() AppConfig {
	configPath := a.GetConfigPath()

	data, err := os.ReadFile(configPath)
	if err != nil {
		// 配置文件不存在，返回默认配置并保存
		config := DefaultConfig()
		a.SaveConfig(config)
		return config
	}

	var config AppConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return DefaultConfig()
	}

	return config
}

// SaveConfig 保存配置
func (a *App) SaveConfig(config AppConfig) error {
	configPath := a.GetConfigPath()

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(configPath, data, 0644)
}

// UpdateLastDir 更新最后访问的目录
func (a *App) UpdateLastDir(dir string) error {
	config := a.GetConfig()
	config.LastDir = dir
	return a.SaveConfig(config)
}

// UpdateAIConfig 更新 AI 配置
func (a *App) UpdateAIConfig(aiConfig AIConfig) error {
	config := a.GetConfig()
	config.AI = aiConfig
	return a.SaveConfig(config)
}
