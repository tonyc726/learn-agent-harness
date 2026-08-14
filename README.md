# learn-agent-harness

从零造一个循环。模型只会说话。循环、工具、界面是你写的。写完这五个文件，你就写过一遍最小 harness。

线上地址：<https://tonyc726.github.io/learn-agent-harness/>

本仓库是一个静态 GitHub Pages 站点。工具箱存在浏览器 `localStorage`，键名 `nano-kit-v1`。下一件在上一件装入之前是锁的。手机上一列：正文在上，工具箱在下；「填入范例 / 选好答案」不用打字。

完整原文请走 [完整版对照](https://tonyc726.github.io/learn-agent-harness/resources.html)，本站不转载 SaladDay/pi-from-scratch 的正文。

## 本地预览

```bash
python3 -m http.server -d docs 8080
```

浏览器打开 <http://127.0.0.1:8080/>。

## 闯关

五个文件，按数据流锁关：

| 件 | 文件 | 装入工具箱 |
| --- | --- | --- |
| 0 | `llm.ts` | Context 进，四种 StreamEvent 出。只接 OpenAI 兼容口 |
| 1 | `agent.ts` | `runAgent`：stream → 工具 → 写回 → 再问，直到 done |
| 2 | `tools.ts` | `read_file` / `write_file` / `edit` / `run_bash`。教学剂，没有批准 |
| 3 | `tui.ts` | 只认 AgentEvent，不认 HTTP |
| 4 | `cli.ts` | 胶水 + `session.jsonl`。cli 认识所有人；tools 不认识 agent |

右侧（手机上是下方）工具箱会一件件变长。没有分数。

## 源码线

[`docs/harness.html`](docs/harness.html) 是新游戏+：按橙皮书生长顺序加缰绳，再按文件读 Pi / Codex / DeepSeek Harness。不加关。

## 页面

| 页面 | 内容 |
| --- | --- |
| `docs/index.html` | 五个文件的地图 |
| `docs/play.html` | `?ch=0..4` 装文件 |
| `docs/harness.html` | 源码线 |
| `docs/repos.html` | 官方仓库对照表 |
| `docs/resources.html` | 对照链接；含完整版对照 |
| `docs/appendix.html` | 旧 CI 门禁关，附录 |
| `docs/deep-agent.html` | 旧三晚速成，附录 |

## 许可

MIT License，Copyright (c) 2026 tonyc726。
