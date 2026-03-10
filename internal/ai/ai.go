package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ChatMessage 聊天消息
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// AIRequest AI 请求
type AIRequest struct {
	Messages  []ChatMessage `json:"messages"`
	Model     string        `json:"model"`
	MaxTokens int           `json:"max_tokens"`
	Stream    bool          `json:"stream"`
}

// AIResponse AI 响应
type AIResponse struct {
	Choices []struct {
		Message ChatMessage `json:"message"`
	} `json:"choices"`
}

// GLMResponse GLM API 响应
type GLMResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// Config AI 配置
type Config struct {
	APIKey      string
	APIEndpoint string
	Model       string
	MaxTokens   int
}

// Service AI 服务
type Service struct {
	config Config
}

// NewService 创建 AI 服务
func NewService(config Config) *Service {
	return &Service{config: config}
}

// Chat AI 聊天
func (s *Service) Chat(message, context string) (string, error) {
	if s.config.APIKey == "" {
		return "", fmt.Errorf("API key not configured")
	}

	messages := []ChatMessage{
		{
			Role: "system",
			Content: "You are a helpful AI assistant for a Markdown editor. Help users with writing, editing, and improving their content.",
		},
	}

	if context != "" {
		messages = append(messages, ChatMessage{
			Role:    "user",
			Content: fmt.Sprintf("Context from the document:\n%s\n\nNow, please respond to my request.", context),
		})
	}

	messages = append(messages, ChatMessage{
		Role:    "user",
		Content: message,
	})

	return s.callAPI(messages)
}

// Suggest AI 建议
func (s *Service) Suggest(text, action string) (string, error) {
	if s.config.APIKey == "" {
		return "", fmt.Errorf("API key not configured")
	}

	var systemPrompt string
	switch action {
	case "polish":
		systemPrompt = "You are a writing assistant. Polish and improve the given text while maintaining its original meaning. Make it more professional, clear, and concise."
	case "expand":
		systemPrompt = "You are a writing assistant. Expand on the given text with more details, examples, or explanations while maintaining the original tone."
	case "summarize":
		systemPrompt = "You are a writing assistant. Provide a concise summary of the given text."
	case "tone":
		systemPrompt = "You are a writing assistant. Adjust the tone of the given text to be more professional and formal."
	default:
		systemPrompt = "You are a helpful writing assistant."
	}

	messages := []ChatMessage{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: text},
	}

	return s.callAPI(messages)
}

// callAPI 调用 AI API
func (s *Service) callAPI(messages []ChatMessage) (string, error) {
	request := AIRequest{
		Messages:  messages,
		Model:     s.config.Model,
		MaxTokens: s.config.MaxTokens,
		Stream:    false,
	}

	body, err := json.Marshal(request)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	client := &http.Client{Timeout: 60 * time.Second}

	req, err := http.NewRequest("POST", s.config.APIEndpoint, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.config.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error (%d): %s", resp.StatusCode, string(respBody))
	}

	// 尝试解析 GLM 响应
	var glmResp GLMResponse
	if err := json.Unmarshal(respBody, &glmResp); err == nil && len(glmResp.Choices) > 0 {
		return glmResp.Choices[0].Message.Content, nil
	}

	// 尝试解析 OpenAI 兼容响应
	var aiResp AIResponse
	if err := json.Unmarshal(respBody, &aiResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if len(aiResp.Choices) == 0 {
		return "", fmt.Errorf("no response from API")
	}

	return aiResp.Choices[0].Message.Content, nil
}
