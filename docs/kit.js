(function () {
  "use strict";

  var KEY = "nano-kit-v1";

  var CHAPTERS = [
    {
      id: 0,
      key: "llm",
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
      key: "agent",
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
      key: "tools",
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
      key: "tui",
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
      key: "cli",
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

  var FILE_KEYS = ["llm", "agent", "tools", "tui", "cli"];
  var HASHES = ["intro", "llm", "agent", "tools", "tui", "cli", "flow"];
  var CH_REDIRECT = {
    "0": "llm",
    "1": "agent",
    "2": "tools",
    "3": "tui",
    "4": "cli",
    end: "flow"
  };

  var state = { lock: false, lastFile: null };
  var revealed = 0;
  var shown = null;
  var sheetOpen = false;
  var inView = {};

  function emptyState() {
    return { lock: false, lastFile: null };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return emptyState();
      var last = data.lastFile;
      if (FILE_KEYS.indexOf(last) === -1) last = null;
      return { lock: !!data.lock, lastFile: last };
    } catch (err) {
      return emptyState();
    }
  }

  function save(next) {
    localStorage.setItem(KEY, JSON.stringify({
      lock: !!next.lock,
      lastFile: next.lastFile || null
    }));
  }

  function chapterByKey(key) {
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].key === key) return CHAPTERS[i];
    }
    return null;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  var TS_KW = {
    export: 1, import: 1, from: 1, type: 1, function: 1, const: 1, let: 1, var: 1,
    async: 1, await: 1, return: 1, if: 1, else: 1, for: 1, of: 1, in: 1, new: 1,
    throw: 1, yield: 1, void: 1, interface: 1, extends: 1, as: 1
  };
  var TS_PRIM = { string: 1, unknown: 1, number: 1, boolean: 1 };

  function highlightTs(src) {
    var out = "";
    var i = 0;
    var n = src.length;
    function take(len, cls) {
      var s = src.slice(i, i + len);
      i += len;
      out += cls
        ? '<span class="tok-' + cls + '">' + escapeHtml(s) + "</span>"
        : escapeHtml(s);
    }
    while (i < n) {
      var c = src.charAt(i);
      var two = src.slice(i, i + 2);
      if (two === "//") {
        var lineEnd = src.indexOf("\n", i);
        if (lineEnd < 0) lineEnd = n;
        take(lineEnd - i, "cmt");
        continue;
      }
      if (two === "/*") {
        var blockEnd = src.indexOf("*/", i + 2);
        if (blockEnd < 0) blockEnd = n;
        else blockEnd += 2;
        take(blockEnd - i, "cmt");
        continue;
      }
      if (c === "\"" || c === "'" || c === "`") {
        var j = i + 1;
        while (j < n) {
          if (src.charAt(j) === "\\") { j += 2; continue; }
          if (src.charAt(j) === c) { j += 1; break; }
          j += 1;
        }
        take(j - i, "str");
        continue;
      }
      if (c >= "0" && c <= "9") {
        var k = i + 1;
        while (k < n && src.charAt(k) >= "0" && src.charAt(k) <= "9") k += 1;
        take(k - i, "num");
        continue;
      }
      if (/[A-Za-z_$]/.test(c)) {
        var w = i + 1;
        while (w < n && /[A-Za-z0-9_$]/.test(src.charAt(w))) w += 1;
        var word = src.slice(i, w);
        var cls = "";
        if (TS_KW[word]) cls = "kw";
        else if (TS_PRIM[word]) cls = "type";
        else if (word.charAt(0) >= "A" && word.charAt(0) <= "Z") cls = "type";
        take(w - i, cls);
        continue;
      }
      take(1, "");
    }
    return out;
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function progressPct() {
    return Math.round((revealed / 5) * 100);
  }

  function renderProgress() {
    var chip = qs("#progress-chip");
    if (chip) chip.textContent = "查看代码 " + progressPct() + "%";
  }

  function renderChips() {
    var root = qs("#kit-chips");
    if (!root) return;
    root.innerHTML = CHAPTERS.slice(0, revealed).map(function (ch) {
      var on = shown === ch.key;
      return (
        '<button type="button" class="kit-chip' + (on ? " is-on" : "") + '" data-key="' +
        ch.key +
        '">' +
        ch.file +
        "</button>"
      );
    }).join("");
  }

  function renderLock() {
    var btn = qs("#kit-lock");
    if (!btn) return;
    btn.textContent = state.lock ? "已锁" : "锁住";
    btn.setAttribute("aria-pressed", state.lock ? "true" : "false");
    btn.classList.toggle("is-locked", state.lock);
  }

  function setSheet(open) {
    sheetOpen = !!open;
    var dock = qs("#kit-dock");
    if (dock) dock.classList.toggle("is-open", sheetOpen);
    document.body.classList.toggle("kit-open", sheetOpen);
    var btn = qs("#kit-sheet-toggle");
    if (btn) {
      btn.textContent = sheetOpen ? "收起" : "打开";
      btn.setAttribute("aria-expanded", sheetOpen ? "true" : "false");
    }
  }

  function revealUpTo(key) {
    var idx = FILE_KEYS.indexOf(key);
    if (idx < 0) return;
    var next = idx + 1;
    if (next > revealed) {
      revealed = next;
      renderChips();
      renderProgress();
    }
  }

  function isPhone() {
    return window.matchMedia && window.matchMedia("(max-width: 559px)").matches;
  }

  function showFile(key) {
    var ch = chapterByKey(key);
    if (!ch) return;
    shown = key;
    state.lastFile = key;
    save(state);
    var label = qs("#kit-file");
    if (label) label.textContent = ch.file;
    var body = qs("#kit-body");
    if (body) body.innerHTML = "<pre><code class=\"lang-ts\">" + highlightTs(ch.sample) + "</code></pre>";
    renderChips();
    if (isPhone()) setSheet(true);
  }

  function activateSection(el) {
    if (!el) return;
    var id = el.id;
    if (id === "flow") {
      revealUpTo("cli");
      if (!state.lock) showFile("cli");
      return;
    }
    if (FILE_KEYS.indexOf(id) === -1) return;
    revealUpTo(id);
    if (!state.lock) showFile(id);
  }

  function hashId() {
    var h = (window.location.hash || "").replace(/^#/, "");
    if (HASHES.indexOf(h) === -1) return "intro";
    return h;
  }

  function applyHash() {
    var id = hashId();
    var el = document.getElementById(id);
    activateSection(el);
    if (el) el.scrollIntoView({ block: "start" });
  }

  function pickInView() {
    var current = null;
    HASHES.forEach(function (id) {
      if (inView[id]) current = inView[id];
    });
    if (current) activateSection(current);
  }

  function observeSections() {
    var sections = qsa(".read-article section[id]");
    if (!sections.length || typeof IntersectionObserver === "undefined") {
      applyHash();
      return;
    }
    var article = qs(".read-article");
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var id = entry.target.id;
          if (entry.isIntersecting) inView[id] = entry.target;
          else delete inView[id];
        });
        pickInView();
      },
      { root: article || null, rootMargin: "-18% 0px -58% 0px", threshold: 0 }
    );
    sections.forEach(function (el) {
      observer.observe(el);
    });
  }

  function bindUi() {
    var lockBtn = qs("#kit-lock");
    if (lockBtn) {
      lockBtn.addEventListener("click", function () {
        state.lock = !state.lock;
        save(state);
        renderLock();
      });
    }

    var toggle = qs("#kit-sheet-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        setSheet(!sheetOpen);
      });
    }

    var chips = qs("#kit-chips");
    if (chips) {
      chips.addEventListener("click", function (ev) {
        var btn = ev.target.closest ? ev.target.closest("[data-key]") : null;
        if (!btn) return;
        var key = btn.getAttribute("data-key");
        if (FILE_KEYS.indexOf(key) === -1) return;
        showFile(key);
        if (isPhone()) setSheet(true);
      });
    }

    window.addEventListener("hashchange", applyHash);
  }

  function initPlay() {
    var params = new URLSearchParams(window.location.search);
    if (params.has("lv")) {
      window.location.replace("appendix.html?lv=" + params.get("lv"));
      return;
    }
    if (params.has("ch")) {
      var dest = CH_REDIRECT[params.get("ch")] || "intro";
      window.location.replace("play.html#" + dest);
      return;
    }

    state = load();
    renderLock();
    renderProgress();
    renderChips();
    setSheet(false);

    if (state.lock && state.lastFile) {
      revealUpTo(state.lastFile);
      showFile(state.lastFile);
    }

    applyHash();
    bindUi();
    observeSections();
  }

  function initHome() {
    var el = qs("#home-code");
    var ch = chapterByKey("llm");
    if (el && ch) el.innerHTML = highlightTs(ch.sample);
  }

  var page = document.body.getAttribute("data-page");
  if (page === "kit-play") initPlay();
  if (page === "kit-home") initHome();
})();
