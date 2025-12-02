import express from "express";
import fetch from "node-fetch";
import OpenAI from "openai";
import 'dotenv/config'; // 自动读取 .env 文件

const app = express();
app.use(express.json({ limit: "10mb" }));

// 从环境变量获取API密钥
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const DASHSCOPE_KEY = process.env.DASHSCOPE_KEY;

// 验证必须的环境变量
if (!OPENROUTER_KEY && !DASHSCOPE_KEY) {
    console.error("请至少设置环境变量 OPENROUTER_KEY 或 DASHSCOPE_KEY 中的一个");
    process.exit(1);
}

// 日志中间件
// app.use((req, res, next) => {
//   console.log("\n=== Incoming Request ===");
//   console.log("URL:", req.originalUrl);
//   console.log("Method:", req.method);
//   console.log("Query:", req.query);
//   console.log("Body:", req.body);
//   console.log("Headers:", req.headers);
//   console.log("========================\n");
//   next();
// });

// 通用转发
app.use(async (req, res) => {
    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const dashscopeUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

    // 根据请求路径或环境变量决定使用哪个上游服务
    const upstreamService = process.env.UPSTREAM_SERVICE || 'dashscope';
    const model = req.body.model || process.env.DEFAULT_MODEL || 'qwen3-max';

    if (upstreamService === 'dashscope') {
        // 使用阿里云DashScope服务
        if (!DASHSCOPE_KEY) {
            res.status(500).json({ error: "DASHSCOPE_KEY is not set in environment variables" });
            return;
        }

        const openai = new OpenAI({
            apiKey: DASHSCOPE_KEY,
            baseURL: dashscopeUrl,
        });

        try {
            const stream = await openai.chat.completions.create(req.body);

            // 设置SSE响应头
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("Access-Control-Allow-Origin", "*");

            // 处理流式响应并转发到客户端
            for await (const chunk of stream) {
                if (chunk.usage) {
                    // 请求结束，打印Token用量。
                    console.log("\n--- 请求用量 ---");
                    console.log(`输入 Tokens: ${chunk.usage.prompt_tokens}`);
                    console.log(`输出 Tokens: ${chunk.usage.completion_tokens}`);
                    console.log(`总计 Tokens: ${chunk.usage.total_tokens}`);
                }
                // 将OpenAI格式的chunk转换为SSE格式并发送
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }

            // 发送结束标记
            res.write(`data: [DONE]\n\n`);
            res.end();

        } catch (err) {
            res.status(500).json({ error: `DashScope request failed: ${err.message}` });
        }
    } else {
        // openRouter
        try {
            const upstreamRes = await fetch(openRouterUrl, {
                method: req.method,
                headers: {
                    Authorization: `Bearer ${OPENROUTER_KEY}`,
                    'HTTP-Referer': 'http://api.ai-proxy.com', // Optional. Site URL for rankings on openrouter.ai.
                    'X-Title': 'ai-proxy', // Optional. Site title for rankings on openrouter.ai.
                    'Content-Type': 'application/json',
                },
                body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body)
            });

            const contentType = upstreamRes.headers.get("content-type") || "";

            // SSE / 流式支持
            if (contentType.includes("text/event-stream")) {
                res.setHeader("Content-Type", "text/event-stream");
                upstreamRes.body.pipe(res);
                return;
            }

            // 普通 JSON / 文本
            const text = await upstreamRes.text();
            res.status(upstreamRes.status).send(text);

        } catch (err) {
            console.error("Upstream Error:", err);
            res.status(500).json({ error: "Upstream request failed", message: err.message });
        }
    }
});

// 添加健康检查端点
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Universal AI Proxy running on http://localhost:${PORT}`);
    console.log(`Upstream service: ${process.env.UPSTREAM_SERVICE || 'dashscope'}`);
    console.log(`Default model: ${process.env.DEFAULT_MODEL || 'qwen3-max'}`);
});
