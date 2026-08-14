# learn-agent-harness

从零造一个循环。模型只会说话。下面五个文件是最小 harness。

线上地址：<https://tonyc726.github.io/learn-agent-harness/>

本仓库是一个静态 GitHub Pages 站点。`docs/play.html` 是一篇可滚动长文：读到哪一份，右边（手机上是底栏）工具箱就亮哪一份。想停在某一份，点工具箱上的锁。

浏览器 `localStorage` 键名 `nano-kit-v1`，只记锁和上次打开的文件（`{ lock, lastFile }`）。不记关卡，不要求装入工件。

完整原文请走 [完整版对照](https://pi-from-scratch.vercel.app)，本站不转载。

## 本地预览

```bash
python3 -m http.server -d docs 8080
```

浏览器打开 <http://127.0.0.1:8080/>。

## 五个文件

按数据流往下读：

| 文件 | 这一份交出什么 |
| --- | --- |
| `llm.ts` | Context 进，四种 StreamEvent 出。只接 OpenAI 兼容口 |
| `agent.ts` | `runAgent`：stream → 工具 → 写回 → 再问，直到 done |
| `tools.ts` | `read_file` / `write_file` / `edit` / `run_bash`。教学剂，没有批准 |
| `tui.ts` | 只认 AgentEvent，不认 HTTP |
| `cli.ts` | 胶水 + `session.jsonl`。cli 认识所有人；tools 不认识 agent |

## 源码线

[`docs/harness.html`](docs/harness.html) 按橙皮书生长顺序加缰绳，再按文件读 Pi / Codex / DeepSeek Harness。

## 页面

| 页面 | 内容 |
| --- | --- |
| `docs/index.html` | 入口。五个文件跳到 `play.html` 锚点 |
| `docs/play.html` | 长文。锚点 `#intro` `#llm` `#agent` `#tools` `#tui` `#cli` `#flow` |
| `docs/harness.html` | 源码线 |
| `docs/repos.html` | 官方仓库对照表 |
| `docs/resources.html` | 对照链接；含完整版对照 |
| `docs/appendix.html` | 旧 CI 门禁关，附录 |
| `docs/deep-agent.html` | 旧三晚速成，附录 |

旧地址 `play.html?ch=0..4` 与 `?ch=end` 会跳到对应锚点。`?lv=` 仍去附录。

## 许可

MIT License，Copyright (c) 2026 tonyc726。
