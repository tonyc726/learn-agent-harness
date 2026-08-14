(function () {
  "use strict";

  var KEY = "nano-kit-v1";

  var CHAPTERS = [
    {
      id: 0,
      file: "llm.ts",
      title: "先能问到模型",
      stem: "没有这一层，循环对着空气说话。",
      expose: "stream：Context 进，StreamEvent 出",
      sample:
        "export type StreamEvent =\n" +
        "  | { type: \"text_delta\"; text: string }\n" +
        "  | { type: \"tool_call\"; id: string; name: string; args: unknown }\n" +
        "  | { type: \"done\" }\n" +
        "  | { type: \"error\"; message: string };\n" +
        "\n" +
        "export type Context = {\n" +
        "  system: string;\n" +
        "  messages: { role: \"user\" | \"assistant\" | \"tool\"; content: string }[];\n" +
        "};\n" +
        "\n" +
        "/** 只走 OpenAI 兼容口。HTTP 和 SSE 的毛边留在这里。 */\n" +
        "export async function* stream(\n" +
        "  ctx: Context,\n" +
        "  tools: { name: string; description: string }[],\n" +
        "): AsyncGenerator<StreamEvent> {\n" +
        "  const res = await fetch(process.env.BASE_URL + \"/chat/completions\", {\n" +
        "    method: \"POST\",\n" +
        "    headers: { Authorization: \"Bearer \" + process.env.API_KEY },\n" +
        "    body: JSON.stringify({\n" +
        "      model: process.env.MODEL,\n" +
        "      stream: true,\n" +
        "      messages: [{ role: \"system\", content: ctx.system }, ...ctx.messages],\n" +
        "      tools,\n" +
        "    }),\n" +
        "  });\n" +
        "  if (!res.ok) yield { type: \"error\", message: String(res.status) };\n" +
        "  // 把 SSE 拆成 text_delta / tool_call / done / error 再往外吐\n" +
        "}\n"
    },
    {
      id: 1,
      file: "agent.ts",
      title: "让模型用得上工具",
      stem: "一次 stream 结束就散了，工具结果回不去。",
      expose: "runAgent：stream → 工具 → 写回 → 再问，直到 done",
      sample:
        "import { stream } from \"./llm\";\n" +
        "import { runTool } from \"./tools\";\n" +
        "\n" +
        "export type AgentEvent =\n" +
        "  | { type: \"text\"; text: string }\n" +
        "  | { type: \"tool_call\"; name: string }\n" +
        "  | { type: \"tool_result\"; name: string; result: string }\n" +
        "  | { type: \"done\" };\n" +
        "\n" +
        "export async function runAgent(ctx, emit: (e: AgentEvent) => void) {\n" +
        "  for (;;) {\n" +
        "    const calls = [];\n" +
        "    for await (const ev of stream(ctx, ctx.toolSpecs)) {\n" +
        "      if (ev.type === \"text_delta\") emit({ type: \"text\", text: ev.text });\n" +
        "      if (ev.type === \"tool_call\") calls.push(ev);\n" +
        "      if (ev.type === \"error\") throw new Error(ev.message);\n" +
        "    }\n" +
        "    if (calls.length === 0) {\n" +
        "      emit({ type: \"done\" });\n" +
        "      return;\n" +
        "    }\n" +
        "    for (const call of calls) {\n" +
        "      emit({ type: \"tool_call\", name: call.name });\n" +
        "      const result = await runTool(call.name, call.args);\n" +
        "      ctx.messages.push({ role: \"tool\", content: result });\n" +
        "      emit({ type: \"tool_result\", name: call.name, result });\n" +
        "    }\n" +
        "  }\n" +
        "}\n"
    },
    {
      id: 2,
      file: "tools.ts",
      title: "四个纯函数干活",
      stem: "循环只会调度。读、写、改、跑命令在这里。",
      expose: "read_file / write_file / edit / run_bash",
      sample:
        "import { readFileSync, writeFileSync } from \"fs\";\n" +
        "import { execSync } from \"child_process\";\n" +
        "\n" +
        "/** 教学剂，没有批准。四个函数不读循环、不读 Context。 */\n" +
        "export function read_file(path: string): string {\n" +
        "  return readFileSync(path, \"utf8\");\n" +
        "}\n" +
        "export function write_file(path: string, content: string): string {\n" +
        "  writeFileSync(path, content);\n" +
        "  return \"wrote \" + path;\n" +
        "}\n" +
        "export function edit(path: string, oldText: string, next: string): string {\n" +
        "  const cur = read_file(path);\n" +
        "  if (!cur.includes(oldText)) return \"old text not found\";\n" +
        "  write_file(path, cur.replace(oldText, next));\n" +
        "  return \"edited \" + path;\n" +
        "}\n" +
        "export function run_bash(cmd: string): string {\n" +
        "  return execSync(cmd, { encoding: \"utf8\" });\n" +
        "}\n" +
        "\n" +
        "export function runTool(name: string, args: { path?: string; content?: string; oldText?: string; next?: string; cmd?: string }): string {\n" +
        "  if (name === \"read_file\") return read_file(args.path || \"\");\n" +
        "  if (name === \"write_file\") return write_file(args.path || \"\", args.content || \"\");\n" +
        "  if (name === \"edit\") return edit(args.path || \"\", args.oldText || \"\", args.next || \"\");\n" +
        "  if (name === \"run_bash\") return run_bash(args.cmd || \"\");\n" +
        "  return \"unknown tool\";\n" +
        "}\n"
    },
    {
      id: 3,
      file: "tui.ts",
      title: "屏幕只认 AgentEvent",
      stem: "循环在黑盒里转，你看不见，也拦不住。",
      expose: "attachTui：只认 AgentEvent，不认 HTTP",
      sample:
        "import * as readline from \"readline\";\n" +
        "import type { AgentEvent } from \"./agent\";\n" +
        "\n" +
        "/** 只认 AgentEvent。不认 HTTP，不拆 SSE。 */\n" +
        "export function attachTui(opts: {\n" +
        "  onLine: (line: string) => void;\n" +
        "  onAbort: () => void;\n" +
        "}) {\n" +
        "  const rl = readline.createInterface({\n" +
        "    input: process.stdin,\n" +
        "    output: process.stdout,\n" +
        "  });\n" +
        "  rl.on(\"line\", opts.onLine);\n" +
        "  process.on(\"SIGINT\", opts.onAbort);\n" +
        "  return {\n" +
        "    paint(ev: AgentEvent) {\n" +
        "      if (ev.type === \"text\") process.stdout.write(ev.text);\n" +
        "      if (ev.type === \"tool_call\") process.stdout.write(\"\\n→ \" + ev.name + \"\\n\");\n" +
        "      if (ev.type === \"tool_result\") process.stdout.write(ev.result + \"\\n\");\n" +
        "      if (ev.type === \"done\") process.stdout.write(\"\\n\");\n" +
        "    },\n" +
        "  };\n" +
        "}\n"
    },
    {
      id: 4,
      file: "cli.ts",
      title: "胶水，加上一本账",
      stem: "零件不会自己握手。会话不落盘，一关终端就忘。",
      expose: "cli 粘合所有人；session.jsonl 记每一轮",
      sample:
        "import { appendFileSync, existsSync, readFileSync } from \"fs\";\n" +
        "import { runAgent } from \"./agent\";\n" +
        "import { attachTui } from \"./tui\";\n" +
        "\n" +
        "const SESSION = \"session.jsonl\";\n" +
        "\n" +
        "function load() {\n" +
        "  if (!existsSync(SESSION)) return [];\n" +
        "  return readFileSync(SESSION, \"utf8\").trim().split(\"\\n\").map((line) => JSON.parse(line));\n" +
        "}\n" +
        "function save(msg: unknown) {\n" +
        "  appendFileSync(SESSION, JSON.stringify(msg) + \"\\n\");\n" +
        "}\n" +
        "\n" +
        "const ctx = { system: \"you write and edit files\", messages: load(), toolSpecs: [] };\n" +
        "const tui = attachTui({\n" +
        "  onLine: async (line) => {\n" +
        "    ctx.messages.push({ role: \"user\", content: line });\n" +
        "    save({ role: \"user\", content: line });\n" +
        "    await runAgent(ctx, (ev) => tui.paint(ev));\n" +
        "    save(ctx.messages[ctx.messages.length - 1]);\n" +
        "  },\n" +
        "  onAbort: () => process.exit(0),\n" +
        "});\n" +
        "// cli 认识所有人。tools 不认识 agent。\n"
    }
  ];

  function emptyState() {
    return { artifacts: {} };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return emptyState();
      if (!data.artifacts || typeof data.artifacts !== "object") data.artifacts = {};
      return data;
    } catch (err) {
      return emptyState();
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function hasArtifact(state, id) {
    return !!(state.artifacts && state.artifacts[String(id)]);
  }

  function unlocked(state, id) {
    if (id === 0) return true;
    if (id === "end") return CHAPTERS.every(function (ch) { return hasArtifact(state, ch.id); });
    return hasArtifact(state, id - 1);
  }

  function firstOpen(state) {
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (!hasArtifact(state, CHAPTERS[i].id)) return CHAPTERS[i].id;
    }
    return "end";
  }

  function putArtifact(state, id) {
    var ch = CHAPTERS[id];
    state.artifacts[String(id)] = {
      file: ch.file,
      title: ch.title,
      at: new Date().toISOString()
    };
    save(state);
    return state;
  }

  function clearAll() {
    localStorage.removeItem(KEY);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function tokensOf(value) {
    return String(value || "")
      .toLowerCase()
      .split(/[\s,，、/|]+/)
      .map(function (t) { return t.replace(/^\./, ""); })
      .filter(Boolean);
  }

  function hasAll(value, needed) {
    var got = tokensOf(value);
    return needed.every(function (n) { return got.indexOf(n) !== -1; });
  }

  function renderFiles(root, state, current) {
    if (!root) return;
    root.innerHTML = CHAPTERS.map(function (ch) {
      var on = hasArtifact(state, ch.id);
      var now = String(current) === String(ch.id);
      return (
        '<span class="lamp' + (on ? " on" : "") + (now ? " now" : "") + '">' +
          '<i class="dot" aria-hidden="true"></i>' +
          ch.file +
        "</span>"
      );
    }).join("");
  }

  function renderRail(root, state, current) {
    if (!root) return;
    var parts = CHAPTERS.map(function (ch, i) {
      var href = "play.html?ch=" + ch.id;
      var label = ch.file;
      var html;
      if (String(current) === String(ch.id)) {
        html = '<a class="now" href="' + href + '">' + label + "</a>";
      } else if (hasArtifact(state, ch.id)) {
        html = '<a class="done" href="' + href + '">' + label + "</a>";
      } else if (unlocked(state, ch.id)) {
        html = '<a href="' + href + '">' + label + "</a>";
      } else {
        html = '<span class="lock">' + label + "</span>";
      }
      if (i < CHAPTERS.length - 1) html += '<span class="seg" aria-hidden="true">·</span>';
      return html;
    });
    if (unlocked(state, "end")) {
      parts.push('<span class="seg" aria-hidden="true">·</span>');
      parts.push(
        current === "end"
          ? '<a class="now" href="play.html?ch=end">收束</a>'
          : '<a class="done" href="play.html?ch=end">收束</a>'
      );
    }
    root.innerHTML = parts.join("");
  }

  function renderMap(root, state) {
    if (!root) return;
    var open = firstOpen(state);
    root.innerHTML = CHAPTERS.map(function (ch) {
      var done = hasArtifact(state, ch.id);
      var openHere = unlocked(state, ch.id);
      var now = String(open) === String(ch.id);
      var cls = done ? "done" : now ? "now" : openHere ? "" : "locked";
      var inner =
        '<span class="mark" aria-hidden="true"></span>' +
        '<span class="idx">' + ch.file + "</span>" +
        "<strong>" + ch.title + "</strong>" +
        "<p class=\"stem\">" + ch.stem + "</p>" +
        "<p>" + (done ? "已在工具箱。" : now ? "当前。先看这一件为什么在。" : openHere ? "可进。" : "上一件还没装入。") + "</p>";
      if (openHere) {
        return '<li class="' + cls + '"><a href="play.html?ch=' + ch.id + '">' + inner + "</a></li>";
      }
      return '<li class="' + cls + '"><div class="dead">' + inner + "</div></li>";
    }).join("");
  }

  function renderKit(root, state, currentId) {
    if (!root) return;
    var blocks = [];
    CHAPTERS.forEach(function (ch) {
      var inKit = hasArtifact(state, ch.id);
      var isCurrent = currentId !== undefined && currentId !== "end" && Number(currentId) === ch.id;
      if (!inKit && !isCurrent) return;
      var tag = inKit ? "已装入" : "正在看";
      blocks.push(
        '<div class="kit-file' + (inKit ? " in" : " draft") + (isCurrent ? " current" : "") + '">' +
          '<p class="kit-name">' + ch.file + " · " + tag + "</p>" +
          "<pre><code>" + escapeHtml(ch.sample) + "</code></pre>" +
        "</div>"
      );
    });
    if (!blocks.length) {
      root.innerHTML = '<p class="empty">还是空的。从 llm.ts 装第一件。</p>';
      return;
    }
    if (CHAPTERS.every(function (ch) { return hasArtifact(state, ch.id); })) {
      blocks.push('<p class="ok">五件齐了。最小 harness 已经在工具箱里。</p>');
    }
    root.innerHTML = blocks.join("");
  }

  function nextHref(id) {
    if (id === 4) return "play.html?ch=end";
    return "play.html?ch=" + (id + 1);
  }

  function nextLabel(id) {
    if (id === 4) return "收束";
    return "下一件 · " + CHAPTERS[id + 1].file;
  }

  function markDone(article, id, state) {
    var done = qs('[data-beat="done"]', article);
    if (done) done.hidden = false;
    var next = qs("[data-next]", article);
    if (next) {
      next.hidden = false;
      var link = qs("a.btn:not(.btn-ghost)", next);
      if (link) {
        link.href = nextHref(id);
        link.textContent = nextLabel(id);
      }
    }
    renderFiles(qs("#files"), state, id);
    renderRail(qs("#rail"), state, id);
    renderKit(qs("#kit-body"), state, id);
  }

  function bindChapter(article, id, state) {
    var fill = qs("[data-fill]", article);
    if (fill) {
      fill.addEventListener("click", function () {
        if (id === 0) qs("#fill-0", article).value = "text_delta tool_call done error";
        if (id === 2) qs("#fill-2", article).value = "read_file write_file edit run_bash";
        qsa('input[type="radio"][value="right"]', article).forEach(function (node) {
          node.checked = true;
        });
      });
    }

    var submit = qs("[data-submit]", article);
    if (!submit) return;
    submit.addEventListener("click", function () {
      var err = qs(".err", article);
      function fail(msg) {
        if (err) err.textContent = msg;
      }
      if (id === 0) {
        if (!hasAll(qs("#fill-0", article).value, ["text_delta", "tool_call", "done", "error"])) {
          fail("四种事件：text_delta / tool_call / done / error。");
          return;
        }
      } else if (id === 1) {
        var a1 = qs('input[name="q1"]:checked', article);
        if (!a1 || a1.value !== "right") {
          fail("遇到 tool_call：执行、写回 Context、再问。");
          return;
        }
      } else if (id === 2) {
        if (!hasAll(qs("#fill-2", article).value, ["read_file", "write_file", "edit", "run_bash"])) {
          fail("四个名字：read_file write_file edit run_bash。");
          return;
        }
      } else if (id === 3) {
        var a3 = qs('input[name="q3"]:checked', article);
        if (!a3 || a3.value !== "right") {
          fail("终端只认 AgentEvent，不认 HTTP。");
          return;
        }
      } else if (id === 4) {
        var a4 = qs('input[name="q4"]:checked', article);
        if (!a4 || a4.value !== "right") {
          fail("只有 cli 认识所有人。tools 不认识 agent。");
          return;
        }
      }
      if (err) err.textContent = "";
      state = putArtifact(load(), id);
      markDone(article, id, state);
    });
  }

  function initMap() {
    var state = load();
    renderFiles(qs("#files"), state);
    renderMap(qs("#trail"), state);
    renderKit(qs("#kit-body"), state);
    var reset = qs("#reset-kit");
    if (reset) {
      reset.addEventListener("click", function () {
        if (!window.confirm("清空本机工具箱，从 llm.ts 重开？")) return;
        clearAll();
        window.location.reload();
      });
    }
  }

  function initPlay() {
    var params = new URLSearchParams(window.location.search);
    if (params.has("lv")) {
      window.location.replace("appendix.html?lv=" + params.get("lv"));
      return;
    }
    var state = load();
    var raw = params.get("ch");
    var chId = raw === "end" ? "end" : parseInt(raw, 10);
    if (raw !== "end" && (isNaN(chId) || chId < 0 || chId > 4)) {
      chId = firstOpen(state);
    }
    if (!unlocked(state, chId)) {
      window.location.replace("play.html?ch=" + firstOpen(state));
      return;
    }

    renderFiles(qs("#files"), state, chId);
    renderRail(qs("#rail"), state, chId);
    renderKit(qs("#kit-body"), state, chId);

    qsa("article.chapter").forEach(function (el) {
      el.hidden = el.getAttribute("data-ch") !== String(chId);
    });

    if (chId === "end") return;

    var article = qs('article.chapter[data-ch="' + chId + '"]');
    if (!article) return;

    if (hasArtifact(state, chId)) {
      markDone(article, chId, state);
      return;
    }
    bindChapter(article, chId, state);
  }

  var page = document.body.getAttribute("data-page");
  if (page === "kit-map") initMap();
  if (page === "kit-play") initPlay();
})();
