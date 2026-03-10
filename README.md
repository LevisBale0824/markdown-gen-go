# Markdown Studio Pro

基于 Go + Wails 构建的 Markdown 编辑器，无 glibc 依赖，支持静态编译。

## 功能特性

- 📝 **Markdown 编辑器** - 实时预览、语法高亮
- 🤖 **AI 助手** - 支持 GLM/OpenAI 兼容 API
- 📁 **文件浏览器** - 目录树、文件监视
- 🌙 **深色模式** - 支持亮色/深色主题切换
- 💾 **本地存储** - 跨平台数据目录支持

## 技术栈

- **后端**: Go 1.25 + Wails v2.11
- **前端**: TypeScript + Vite + TailwindCSS
- **编辑器**: CodeMirror 6
- **安装包**: NSIS (Windows)

## 开发

```bash
# 安装依赖
cd frontend && npm install

# 开发模式
wails dev

# 构建
wails build

# 构建安装包 (Windows)
wails build -nsis
```

## 编译

### Windows

```bash
# 前置要求
# - Go 1.21+
# - Node.js 18+
# - Wails CLI: go install github.com/wailsapp/wails/v2/cmd/wails@latest

# 安装依赖
cd frontend && npm install

# 开发构建
wails build

# 生成安装包
wails build -nsis
```

### Linux (CentOS/RHEL/Rocky)

```bash
# 安装依赖
sudo dnf install -y gcc-c++ pkgconfig webkit2gtk3-devel

# 安装 Go (如果没有)
wget https://go.dev/dl/go1.21.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# 安装 Node.js (如果没有)
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# 安装 Wails
go install github.com/wailsapp/wails/v2/cmd/wails@latest
export PATH=$PATH:$(go env GOPATH)/bin

# 编译
cd markdown-gen-go
cd frontend && npm install && cd ..
wails build

# 运行
./build/bin/markdown-gen-go
```

### Linux (Ubuntu/Debian)

```bash
# 安装依赖
sudo apt install -y build-essential pkg-config libwebkit2gtk-4.0-dev

# 安装 Go、Node.js、Wails (同上)

# 编译
wails build
```

### macOS

```bash
# 安装依赖
brew install pkg-config node

# 安装 Wails
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# 编译
wails build
```

## 目录结构

```
markdown-gen-go/
├── main.go              # 应用入口
├── app.go               # 应用主结构
├── internal/            # 内部包
│   ├── ai/              # AI 服务
│   ├── config/          # 配置管理
│   ├── file/            # 文件操作
│   └── watcher/         # 文件监视
├── frontend/            # 前端代码
│   ├── src/ts/          # TypeScript 源码
│   └── styles.css       # 样式文件
└── build/               # 构建配置
```

## 数据存储

### Windows（便携式）

```
<安装目录>\
├── config\
│   └── config.json      # 配置文件（API Key 等）
└── notes\               # 笔记数据
```

### Linux/macOS（XDG 标准）

```
~/.config/markdown-gen-go/
└── config.json          # 配置文件

~/.local/share/markdown-gen-go/notes/
└── *.md                 # 笔记数据
```

环境变量支持：
- `XDG_CONFIG_HOME` - 自定义配置目录
- `XDG_DATA_HOME` - 自定义数据目录

## License

MIT
