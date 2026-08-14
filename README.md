# learn-agent-harness

别把模型当成整个 Agent。模型会说话；真正改系统的是你在外面加的规矩。那套规矩叫 harness。

线上地址：<https://tonyc726.github.io/learn-agent-harness/>

本仓库是一个静态 GitHub Pages 站点。证物存在浏览器 `localStorage`，键名 `ci-gate-campaign-v1`。下一关在证物齐之前是锁的。不转载橙皮书 PDF，也不摘录其正文。

CI「红了先通知你、不要自动发版」只是练习用的假任务。你要学的不是 Jenkins，是怎么给模型套缰绳。

## 本地预览

```bash
python3 -m http.server -d docs 8080
```

浏览器打开 <http://127.0.0.1:8080/>。

## 闯关

打完你会：写清说明书、危险动作只申请你确认、密文不准进对话、旧确认作废、对话停了去对账。

| 关 | 证物 |
| --- | --- |
| 0 口头「开了」不能写库 | 自然语言确认 ≠ 授权；commit 不在工具清单 |
| 1 先写说明书 | 五句话：你是谁、成功、工具、工作区、停手 |
| 2 密文不准进对话 | id / revision / status / summary，无密钥 |
| 3 先停用，再申请启用 | 停用回执（rule id + revision） |
| 4 确认坞：模型不能自己提交 | 键入「批准」 |
| 5 旧确认必须作废 | 版本不匹配回执 |
| 6 对话停了，CI 还在 | 停止生成 ≠ 取消 CI；unknown 按 intent 收敛 |

每关四拍：先挨打、先回忆再讲、先做再给答案、过关看证物。没有分数。

六性灯：版本诚实 / 事务完整 / 结果可知 / 重试安全 / 边界卫生 / 授权内聚。

## 源码线

[`docs/harness.html`](docs/harness.html) 是新游戏+：按橙皮书生长顺序加缰绳，再按文件读 Pi / Codex / DeepSeek Harness。不加关。

## 页面

| 页面 | 内容 |
| --- | --- |
| `docs/index.html` | 先说你会什么，再进闯关地图 |
| `docs/play.html` | 关卡 |
| `docs/harness.html` | 源码线 |
| `docs/repos.html` | 官方仓库对照表 |
| `docs/resources.html` | 对照链接；含序章「为什么」 |
| `docs/deep-agent.html` | 旧三晚速成，附录 |

## 许可

MIT License，Copyright (c) 2026 tonyc726。
