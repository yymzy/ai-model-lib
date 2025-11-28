# 模型转发与员工管理系统设计文档 (完整版)

## 1. 概述

本系统旨在为团队提供统一的模型访问入口,通过 **CLI 工具** 和 **Web 管理后台** 实现对 AI 模型(OpenAI, Gemini, Claude 等)的集中管理与代理转发。

**技术栈:**
-   **语言**: TypeScript (全栈)
-   **后端**: Egg.js + MySQL + Sequelize
-   **前端**: React + Ant Design Pro + UmiJS
-   **CLI**: Node.js + Commander

**核心目标:**
-   **统一入口**:团队内部统一使用 CLI 或 API 访问模型。
-   **Key 安全**:对外隐藏真实 API Key,避免泄露。
-   **账号风控**:支持多 Key 负载均衡与轮询,降低单账号封号风险。
-   **权限管控**:精细化管理员工权限、可用模型及每日调用额度。
-   **审计监控**:全量记录调用日志,监控 Token 消耗与异常流量。

---

## 2. 系统架构 (Monorepo)

本项目采用统一的根目录结构，包含三个独立端：

```text
project-root/
│
├── cli/                     # 命令行工具 (Node.js npm 包)
│   # 负责转发员工请求到 Server
│
├── client/                  # 管理后台前端 (React + Ant Design Pro)
│   # 负责可视化的员工与模型管理
│
└── server/                  # 后端服务 (Egg.js + MySQL)
    # 核心服务：提供管理 API + 模型代理转发服务
```

### 交互流程
1.  **CLI / Client** -> **Server**: 所有请求均发送至 Server。
2.  **Server** -> **Model API**: Server 鉴权通过后，代理转发请求至真实的 AI 模型提供商。

---

## 3. CLI 工具 (`cli/`)

模仿 Gemini CLI 的交互体验，作为员工日常使用的终端工具。

### 3.1 功能特性
-   **身份绑定**：员工需配置 `employeeId` 和 `token`。
-   **智能路由**：支持 `auto` 模式，由 Server 智能选择最优/负载最低的模型。
-   **手动切换**：支持从 Server 拉取授权模型列表并手动指定。
-   **无感代理**：所有请求自动封装鉴权信息转发至 Server。

### 3.2 目录结构
```text
cli/
  ├─ bin/cli.js       # 入口文件
  ├─ src/
  │   ├─ config.ts    # 配置管理 (Token, Server URL)
  │   ├─ api.ts       # 与 Server 通信接口
  │   ├─ command-run.ts # 核心命令逻辑
  │   └─ utils/
  └─ package.json
```

---

## 4. 管理系统前端 (`client/`)

基于 **React + Ant Design Pro + UmiJS** 构建的现代化管理后台。

### 4.1 功能模块
-   **仪表盘**：实时展示 Token 消耗、活跃用户、模型健康度。
-   **员工管理**：新增/编辑员工，禁用违规账号，重置 Token。
-   **模型管理**：录入模型 Key，设置 QPS 限制，启用/停用模型。
-   **权限配置**：为员工分配模型权限，设置每日调用上限。
-   **日志审计**：查看详细的调用流水（时间、模型、Token 数、用户）。

### 4.2 目录结构
```text
client/
  ├─ src/
  │   ├─ pages/       # 页面组件
  │   ├─ components/  # 公共组件
  │   ├─ services/    # API 请求层
  │   └─ models/      # 全局状态管理
  ├─ config/          # Umi 配置
  └─ package.json
```

---

## 5. 后端服务 (`server/`)

基于 **Egg.js + MySQL**，是系统的核心枢纽。

### 5.1 核心职责
1.  **管理 API**：提供给 Client 的 RESTful 接口（RBAC 鉴权）。
2.  **代理服务**：提供给 CLI 的 `/api/proxy` 接口。
    -   **鉴权**：校验 User Token 及状态。
    -   **限流**：检查每日额度及 QPS。
    -   **路由**：根据策略（轮询/权重/随机）选择真实的 Model Key。
    -   **转发**：请求真实 API 并流式透传响应。
    -   **计费**：异步记录 Token 消耗日志。
3.  **定时任务**：每日额度重置、异常监控报警。

### 5.2 目录结构
```text
server/
  ├─ app/
  │   ├─ controller/  # 控制器 (API)
  │   ├─ service/     # 业务逻辑 (代理、调度)
  │   ├─ model/       # Sequelize 模型定义
  │   ├─ middleware/  # 中间件 (JWT, ErrorHandler)
  │   └─ schedule/    # 定时任务
  ├─ config/
  └─ package.json
```

---

## 6. 数据库设计 (MySQL)

### 6.1 `user` (员工表)
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | int | 主键 |
| `name` | varchar | 员工姓名 |
| `email` | varchar | 登录账号/邮箱 |
| `password` | varchar | 加密密码 |
| `role` | tinyint | 0: 普通员工, 1: 管理员 |
| `status` | tinyint | 0: 正常, 1: 禁用 (拉黑) |

### 6.2 `model` (模型配置表)
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | int | 主键 |
| `name` | varchar | 模型显示名称 (e.g., GPT-4) |
| `provider` | varchar | 提供商 (openai, anthropic, google) |
| `api_key` | varchar | 真实 API Key |
| `enabled` | tinyint | 1: 启用, 0: 禁用 |
| `qps_limit` | int | QPS 限制阈值 |

### 6.3 `user_model_permission` (权限表)
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | int | 主键 |
| `user_id` | int | 关联员工 ID |
| `model_id` | int | 关联模型 ID |
| `daily_limit` | int | 每日最大调用次数 |

### 6.4 `usage_log` (日志表)
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | int | 主键 |
| `user_id` | int | 调用者 ID |
| `model_id` | int | 使用的模型 ID |
| `tokens` | int | 消耗 Token 数 |
| `created_at` | datetime | 调用时间 |

---

## 7. 鉴权与安全

采用 **JWT (JSON Web Token)** 标准。

1.  **管理员**：登录 Client 获取 `admin_token`，拥有全量管理权限。
2.  **员工**：
    -   管理员创建账号后生成初始 `user_token`。
    -   CLI 配置该 Token 进行请求。
    -   Server 校验 Token 有效性及 `user.status`。
3.  **通信安全**：建议全站启用 HTTPS，防止 Token 劫持。

---

## 8. 环境变量与配置

根目录 `.env` 文件统一管理（建议）：

```bash
# 基础配置
API_BASE_URL=https://api.your-internal.com
JWT_SECRET=your_secure_random_string

# 数据库
MYSQL_HOST=127.0.0.1
MYSQL_USER=root
MYSQL_PWD=secure_password
MYSQL_DB=model_proxy

# 代理配置 (可选)
# HTTP_PROXY=...
```

---

## 9. 开发与部署

### 9.1 本地开发
```bash
# 1. 启动后端
cd server && npm install && npm run dev

# 2. 启动前端
cd client && npm install && npm run dev

# 3. 调试 CLI
cd cli && npm link
cli run --model auto "Hello World"
```

### 9.2 生产部署
-   **Server**: 使用 Docker 容器化部署，或 PM2 守护进程运行。建议配置 Nginx 反向代理。
-   **Client**: 构建静态资源 (`npm run build`)，托管至 Nginx 或 CDN。
-   **CLI**: 发布至私有 npm 仓库 (`npm publish`)，员工通过 `npm i -g @company/cli` 安装。
