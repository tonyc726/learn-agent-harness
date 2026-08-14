# learn-agent-harness

先把业务 Agent 做稳，再决定要不要读源码。

线上地址：<https://tonyc726.github.io/learn-agent-harness/>

本仓库是一个静态 GitHub Pages 站点，不转载橙皮书 PDF，也不摘录其正文。对照时请打开官方仓库与文档。

## 本地预览

```bash
python3 -m http.server -d docs 8080
```

浏览器打开 <http://127.0.0.1:8080/>。

## 两条线

- **Track A · 三晚速成**：用 LangChain Deep Agents 把一条业务黄金路径箍住。入口 [`docs/deep-agent.html`](docs/deep-agent.html)。这三晚只对照橙皮书 §01 / §04 / §10。
- **Track B · 源码线**：按橙皮书的生长顺序加缰绳，再按文件顺序读 Pi / Codex / DeepSeek Harness。入口 [`docs/harness.html`](docs/harness.html)。

Agent = 模型 + harness。Deep Agents 本身已经是一套 harness，三晚先把它用稳，不必先拆别人的循环。

## 页面

| 页面 | 内容 |
| --- | --- |
| `docs/index.html` | 首页，选线 |
| `docs/deep-agent.html` | Track A 三晚速成 |
| `docs/harness.html` | Track B 源码线 |
| `docs/repos.html` | 官方仓库对照表 |
| `docs/resources.html` | 官方文档与对照链接 |

## 许可

MIT License，Copyright (c) 2026 tonyc726。
