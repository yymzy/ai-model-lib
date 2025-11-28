# 模型转发与员工管理系统设计文档（v3，含统一目录结构）

## 概述

本系统由 **CLI 工具 + 管理系统（前后端分离：client/server）+
模型代理服务** 组成。\
目的：团队内部统一使用模型、管理
Key、分配权限、监控模型调用量并降低封号风险。

------------------------------------------------------------------------

# 1. 项目统一根目录结构（新增）

    project-root/
    │
    ├─ cli/                     # 类 Gemini CLI 的命令行工具（npm 包）
    │
    ├─ client/                  # 管理系统前端（React + Ant Design Pro + UmiJS）
    │
    └─ server/                  # 管理系统后端（Egg.js + MySQL + 模型代理服务）

### 说明

-   统一根目录，便于版本管理、CI/CD、环境变量共享。
-   三端互不耦合，可独立部署和开发。
-   server 除提供管理 API 外，还承担 **模型代理服务**。

------------------------------------------------------------------------

# 2. CLI 工具（cli/）

### 主要功能

-   模仿 Gemini CLI 的交互方式
-   使用员工 ID + Token 调用 server
-   支持 auto/手动切换模型
-   自动从 server 拉取可用模型/用量
-   一切模型调用均经过 server 的统一代理（安全）

### CLI 目录结构

    cli/
      ├─ bin/cli.js
      ├─ src/
      │   ├─ config.ts
      │   ├─ api.ts
      │   ├─ command-run.ts
      │   └─ utils/
      └─ package.json

------------------------------------------------------------------------

# 3. 管理系统（前后端分离）

# 3.1 client（前端：React + Ant Design Pro + UmiJS）

### 功能：

-   员工管理
-   模型管理
-   权限配置
-   调用日志展示
-   用量统计仪表盘
-   系统配置

### client 目录结构

    client/
      ├─ src/
      │   ├─ pages/
      │   ├─ components/
      │   ├─ services/   # 调 server API
      │   └─ models/
      ├─ public/
      ├─ config/
      ├─ package.json

### client → server 调用方式

使用 token（Bearer），调用 REST API。

------------------------------------------------------------------------

# 3.2 server（后端：Egg.js + MySQL + 模型代理）

### 模块组成

-   管理端 API（RBAC、模型管理、员工管理）
-   CLI 端 API（调用模型、权限校验、额度校验）
-   模型代理层（统一 key 转发模型）
-   日志记录与计费统计
-   定时任务（用量清零/报警/QPS 限流）

### server 目录结构

    server/
      ├─ app/
      │   ├─ controller/     # REST API
      │   ├─ service/        # 权限/模型调度/调用逻辑
      │   ├─ model/          # MySQL 表结构
      │   ├─ middleware/     # token 校验等
      │   └─ schedule/       # 定时任务
      ├─ config/
      └─ package.json

------------------------------------------------------------------------

# 4. 后端数据库结构（保持不变）

（略，承接 v2 文档内容，包括 user、model、permission、usage_log 等）

------------------------------------------------------------------------

# 5. 系统架构（含三个端）

    project-root/
    │
    ├── cli/               →  请求 →  server（代理模型） → 模型 API
    │
    ├── client/            →  请求 →  server（管理后台）
    │
    └── server/            →  转发 →  OpenAI/Gemini/Claude/本地模型

------------------------------------------------------------------------

# 6. 环境变量（新增建议）

根目录 `.env` 文件，client/server/cli 共用：

    API_BASE_URL=https://your-domain.com/api
    MODEL_PROXY_URL=https://your-domain.com/api/proxy

    MYSQL_HOST=...
    MYSQL_USER=...
    MYSQL_PWD=...

    JWT_SECRET=xxx

client 与 cli 读取 `.env` 或 `.env.local`。

------------------------------------------------------------------------

# 7. 本地开发方式（新增）

    cd project-root

    # 后端
    cd server && npm install && npm run dev

    # 前端
    cd client && npm install && npm run dev

    # CLI
    cd cli && npm link   # 本地全局调试 CLI
    cli run --model auto

------------------------------------------------------------------------

# 8. 部署方式（新增）

### server

-   PM2 / Docker 运行
-   Nginx 反向代理

### client

-   构建静态资源放入 Nginx

### cli

-   发布到 npm，公司内部统一使用

------------------------------------------------------------------------

# 9. 总结（v3 更新点）

-   新增统一根目录结构（cli/client/server）
-   后端文件夹名从 admin-backend → server
-   前端文件夹名从 admin-frontend → client
-   加入统一环境变量规范
-   加入本地开发与部署建议

此版本为完整可实施的项目结构方案。
