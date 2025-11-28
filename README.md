# AI Model Proxy System

模型转发与员工管理系统 - 统一的 AI 模型访问入口

## 项目结构

```
project-root/
├── cli/                    # CLI 工具
├── client/                 # 管理后台前端
├── server/                 # 后端服务
├── .env.example           # 环境变量模板
└── README.md              # 本文件
```

## 快速开始

### 1. 环境准备

- Node.js >= 16.x
- MySQL >= 5.7
- npm 或 yarn

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件,填入实际配置
```

### 3. 启动后端服务

```bash
cd server
npm install
npm run dev
```

### 4. 启动前端管理后台

```bash
cd client
npm install
npm run dev
```

### 5. 安装 CLI 工具

```bash
cd cli
npm install
npm link
```

## 详细文档

请参阅 [model_proxy_system_complete.md](./model_proxy_system_complete.md) 获取完整的系统设计文档。

## 开发指南

### Server 端
- 基于 Egg.js + MySQL
- 提供管理 API 和模型代理服务
- 端口: 7001

### Client 端
- 基于 React + Ant Design Pro + UmiJS
- 管理员后台界面
- 端口: 8000

### CLI 工具
- Node.js CLI 工具
- 员工日常使用的命令行接口

## License

MIT
