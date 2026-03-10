# Markdown Studio Pro

基于 Go + Wails 构建的 Markdown 编辑器，无 glibc 依赖，支持静态编译。

## 功能特性

- 📝 **Markdown 编辑器** - 实时预览、语法高亮
- 🤖 **AI 助手** - 支持 GLM/OpenAI 兼容 API
- 📁 **文件浏览器** - 目录树、文件监视
- 🌙 **深色模式** - 支持亮色/深色主题切换
- 💾 **本地存储** - 笔记存储在安装目录的 notes 文件夹

## 技术栈

- **后端**: Go 1.25 + Wails v2.11
- **前端**: TypeScript + Vite + TailwindCSS
- **编辑器**: CodeMirror 6
- **安装包**: NSIS

## 开发

```bash
# 安装依赖
cd frontend && npm install

# 开发模式
wails dev

# 构建
wails build

# 构建安装包
wails build -nsis
```

## 目录结构

```
markdown-gen-go/
├── app.go          # 应用核心逻辑
├── file.go         # 文件操作
├── config.go       # 配置管理
├── ai.go           # AI 助手集成
├── watcher.go      # 文件监视
├── main.go         # 入口文件
├── frontend/       # 前端代码
│   ├── src/ts/     # TypeScript 源码
│   └── styles.css  # 样式文件
└── build/          # 构建配置
```

## License

MIT
