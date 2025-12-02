# AI模型代理服务技术方案

## 项目概述

这是一个基于阿里云DashScope OpenAI兼容模式的AI模型代理服务，旨在为开发工具提供智能辅助功能。服务支持流式响应和工具调用，能够正确处理CLI工具和开发环境中的请求。

## 需求分析

### 核心需求
1. **AI模型代理** - 通过API接口代理阿里云模型请求
2. **流式响应支持** - 支持SSE（Server-Sent Events）流式响应，便于CLI工具集成
3. **工具调用支持** - 正确处理函数调用和工具调用请求
4. **多服务商支持** - 支持阿里云DashScope和OpenRouter两种上游服务

### 功能需求
- 通用AI请求代理（兼容OpenAI API格式）
- 工具调用参数透传
- 流式数据响应
- 健康检查
- 错误处理和日志记录

## 技术架构

### 核心技术栈
- **Node.js** - 服务端运行环境
- **Express** - Web框架
- **OpenAI SDK** - 阿里云DashScope API客户端
- **node-fetch** - HTTP请求库（用于OpenRouter）
- **dotenv** - 环境变量管理

### 设计模式
- **中间件模式** - 请求处理链
- **路由分发** - 多服务商路由
- **流式响应** - SSE协议实现

## 实现方案

### API设计

#### 通用端点
- `POST /` - 通用AI请求代理，支持完整的OpenAI格式

#### 系统端点
- `GET /health` - 健康检查

### 核心功能实现

#### 1. 多服务商支持
- **阿里云DashScope**: 使用OpenAI SDK连接 `https://dashscope.aliyuncs.com/compatible-mode/v1`
- **OpenRouter**: 使用fetch直接调用 `https://openrouter.ai/api/v1/chat/completions`

#### 2. 工具调用处理
- 正确透传 `tool_choice` 参数
- 支持完整的OpenAI请求参数
- 保持原始请求格式不变

#### 3. 流式响应实现
- 使用SSE协议传输数据
- 正确设置响应头：
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
  - `Access-Control-Allow-Origin: *`
- 按规范格式发送数据块：`data: ${JSON.stringify(chunk)}\n\n`
- 发送`[DONE]`结束标记

#### 4. Token用量监控
- 在流式响应中捕获usage信息
- 记录到控制台：输入Tokens、输出Tokens、总计Tokens

### 安全考虑
- 环境变量存储API密钥
- 请求验证和错误处理
- 输入限制（10MB JSON body limit）

## 配置说明

### 环境变量
- `DASHSCOPE_KEY` - 阿里云DashScope API密钥
- `OPENROUTER_KEY` - OpenRouter API密钥（可选）
- `UPSTREAM_SERVICE` - 上游服务选择（默认: dashscope）
- `DEFAULT_MODEL` - 默认模型名称（默认: qwen3-max）
- `PORT` - 服务端口（默认: 3000）

### 当前配置示例
```bash
OPENROUTER_KEY=
DASHSCOPE_KEY=sk-660a71f4ba0347d3ab19bb44d55da6ee
UPSTREAM_SERVICE=dashscope
DEFAULT_MODEL=qwen3-max
```

## 使用示例

### 通用请求
```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-max",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "stream": true,
    "tool_choice": "auto"
  }'
```

### 工具调用请求
```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-max",
    "messages": [
      {"role": "user", "content": "获取北京的天气"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "获取指定城市的天气信息",
          "parameters": {
            "type": "object",
            "properties": {
              "city": {"type": "string"}
            },
            "required": ["city"]
          }
        }
      }
    ],
    "tool_choice": "auto",
    "stream": true
  }'
```

## 部署说明

### 依赖安装
```bash
npm install
```

### 启动服务
```bash
npm start
```

### 服务启动信息
- 服务地址: `http://localhost:3000`
- 上游服务: dashscope
- 默认模型: qwen3-max

## 扩展计划

### 近期计划
- 添加开发辅助专用端点（文件生成、代码重构、代码解释）
- 增强CORS支持
- 添加API文档端点

### 长期计划
- 插件系统
- 多模型支持
- 本地模型支持
- 团队协作功能