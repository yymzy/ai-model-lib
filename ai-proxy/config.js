export const upstreams = {
  "deepseek-chat": {
    baseURL: "https://api.deepseek.com",
    model: "deepseek-chat",
    key: process.env.DEEPSEEK_KEY
  },
  "openrouter-qwen": {
    baseURL: "https://openrouter.ai/api",
    model: "qwen/qwen2.5-coder",
    key: process.env.OPENROUTER_KEY
  },
  "local-ollama-qwen": {
    baseURL: "http://localhost:11434",
    model: "qwen2.5-coder",
    key: null
  }
};
