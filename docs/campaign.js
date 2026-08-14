(function () {
  "use strict";

  var KEY = "ci-gate-campaign-v1";

  var LAMPS = [
    { id: "version", name: "版本诚实" },
    { id: "txn", name: "事务完整" },
    { id: "known", name: "结果可知" },
    { id: "retry", name: "重试安全" },
    { id: "boundary", name: "边界卫生" },
    { id: "auth", name: "授权内聚" }
  ];

  var LEVELS = [
    { id: 0, title: "口头「开了」不能写库", lamps: ["auth"], slot: "自然语言确认 ≠ 授权；commit 不在工具清单", stem: "聊天里说开了，库里没写。" },
    { id: 1, title: "先写说明书", lamps: ["boundary"], slot: "五句话说明书", stem: "只开门禁，不许发版。" },
    { id: 2, title: "密文不准进对话", lamps: ["boundary"], slot: "安全投影清单", stem: "模型只看干净摘要。" },
    { id: 3, title: "先停用，再申请启用", lamps: ["txn"], slot: "停用草稿回执", stem: "练习任务：红了先通知，不要自动发版。" },
    { id: 4, title: "确认坞：模型不能自己提交", lamps: ["auth"], slot: "键入「批准」的坞条", stem: "你点确认才提交。" },
    { id: 5, title: "旧确认必须作废", lamps: ["version"], slot: "版本不匹配回执", stem: "批准的必须是你看见的那一版。" },
    { id: 6, title: "对话停了，CI 还在", lamps: ["known", "retry"], slot: "停止生成 ≠ 取消 CI；unknown 已收敛", stem: "断了去对账，别瞎重试。" }
  ];

  function emptyState() {
    return { artifacts: {}, lamps: {} };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return emptyState();
      if (!data.artifacts || typeof data.artifacts !== "object") data.artifacts = {};
      if (!data.lamps || typeof data.lamps !== "object") data.lamps = {};
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
    if (id === "end") return LEVELS.every(function (lv) { return hasArtifact(state, lv.id); });
    return hasArtifact(state, id - 1);
  }

  function firstOpen(state) {
    for (var i = 0; i < LEVELS.length; i++) {
      if (!hasArtifact(state, LEVELS[i].id)) return LEVELS[i].id;
    }
    return "end";
  }

  function putArtifact(state, id, payload) {
    var lv = LEVELS[id];
    state.artifacts[String(id)] = {
      title: lv.title,
      slot: lv.slot,
      at: new Date().toISOString(),
      text: payload
    };
    (lv.lamps || []).forEach(function (lamp) {
      state.lamps[lamp] = true;
    });
    save(state);
    return state;
  }

  function clearAll() {
    localStorage.removeItem(KEY);
  }

  function renderLamps(root, state) {
    if (!root) return;
    root.innerHTML = LAMPS.map(function (lamp) {
      var on = !!state.lamps[lamp.id];
      return (
        '<span class="lamp' + (on ? " on" : "") + '" data-lamp="' + lamp.id + '">' +
          '<i class="dot" aria-hidden="true"></i>' +
          lamp.name +
        "</span>"
      );
    }).join("");
  }

  function renderRail(root, state, current) {
    if (!root) return;
    var parts = LEVELS.map(function (lv, i) {
      var href = "appendix.html?lv=" + lv.id;
      var cls = "seg";
      var label = lv.id + " " + lv.title;
      var html;
      if (String(current) === String(lv.id)) {
        html = '<a class="now" href="' + href + '">' + label + "</a>";
      } else if (hasArtifact(state, lv.id)) {
        html = '<a class="done" href="' + href + '">' + label + "</a>";
      } else if (unlocked(state, lv.id)) {
        html = '<a href="' + href + '">' + label + "</a>";
      } else {
        html = '<span class="lock">' + label + "</span>";
      }
      if (i < LEVELS.length - 1) html += '<span class="seg" aria-hidden="true">·</span>';
      return html;
    });
    if (unlocked(state, "end")) {
      parts.push('<span class="seg" aria-hidden="true">·</span>');
      parts.push(
        current === "end"
          ? '<a class="now" href="appendix.html?lv=end">收束</a>'
          : '<a class="done" href="appendix.html?lv=end">收束</a>'
      );
    }
    root.innerHTML = parts.join("");
  }

  function renderMap(root, state) {
    if (!root) return;
    var open = firstOpen(state);
    root.innerHTML = LEVELS.map(function (lv) {
      var done = hasArtifact(state, lv.id);
      var openHere = unlocked(state, lv.id);
      var now = String(open) === String(lv.id);
      var cls = done ? "done" : now ? "now" : openHere ? "" : "locked";
      var inner =
        '<span class="mark" aria-hidden="true"></span>' +
        '<span class="idx">第 ' + lv.id + " 关</span>" +
        "<strong>" + lv.title + "</strong>" +
        (lv.stem ? "<p class=\"stem\">" + lv.stem + "</p>" : "") +
        "<p>" + (done ? "证物已在坞里。" : now ? "当前。先挨打。" : openHere ? "可进。" : "上一关的证物还没有。") + "</p>";
      if (openHere) {
        return '<li class="' + cls + '"><a href="appendix.html?lv=' + lv.id + '">' + inner + "</a></li>";
      }
      return '<li class="' + cls + '"><div class="dead">' + inner + "</div></li>";
    }).join("");
  }

  function renderDockList(root, state) {
    if (!root) return;
    var items = LEVELS.filter(function (lv) { return hasArtifact(state, lv.id); });
    if (!items.length) {
      root.innerHTML = '<p class="empty">坞是空的。过关看证物，不看「我读过」。</p>';
      return;
    }
    root.innerHTML =
      '<ul class="receipt-list">' +
      items.map(function (lv) {
        return (
          "<li><a href=\"appendix.html?lv=" + lv.id + "\">" +
          lv.id + " · " + lv.title +
          "</a><div class=\"empty\">" + lv.slot + "</div></li>"
        );
      }).join("") +
      "</ul>";
  }

  function renderDockSlot(root, state, lvId) {
    if (!root) return;
    if (lvId === "end") {
      root.innerHTML = unlocked(state, "end")
        ? '<p class="empty">七份证物齐了。源码线是另一条线，不加关。</p>'
        : '<p class="empty">还有关没过。</p>';
      return;
    }
    var lv = LEVELS[lvId];
    var art = state.artifacts[String(lvId)];
    if (art) {
      root.innerHTML = '<pre class="receipt">' + escapeHtml(art.text) + "</pre>";
    } else {
      root.innerHTML = '<p class="empty">空槽。本关证物：' + lv.slot + "</p>";
    }
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

  function showBeat(levelEl, name) {
    qsa(".beat", levelEl).forEach(function (beat) {
      beat.hidden = beat.getAttribute("data-beat") !== name;
    });
  }

  function checkedRight(name) {
    var node = document.querySelector('input[name="' + name + '"]:checked');
    return node && node.value === "right";
  }

  function showHint(id, on) {
    var node = document.getElementById(id);
    if (node) node.hidden = !on;
  }

  function setText(id, text) {
    var node = document.getElementById(id);
    if (node) node.textContent = text || "";
  }

  function initMap() {
    var state = load();
    renderLamps(qs("#lamps"), state);
    renderMap(qs("#trail"), state);
    renderDockList(qs("#dock-body"), state);
    var reset = qs("#reset-campaign");
    if (reset) {
      reset.addEventListener("click", function () {
        if (!window.confirm("清空本机证物，从第 0 关重开？")) return;
        clearAll();
        window.location.reload();
      });
    }
  }

  function initPlay() {
    var state = load();
    var params = new URLSearchParams(window.location.search);
    var raw = params.get("lv");
    var lvId = raw === "end" ? "end" : parseInt(raw, 10);
    if (raw !== "end" && (isNaN(lvId) || lvId < 0 || lvId > 6)) {
      lvId = firstOpen(state);
    }
    if (!unlocked(state, lvId)) {
      window.location.replace("appendix.html?lv=" + firstOpen(state));
      return;
    }

    renderLamps(qs("#lamps"), state);
    renderRail(qs("#rail"), state, lvId);
    renderDockSlot(qs("#dock-body"), state, lvId);

    qsa("article.level").forEach(function (el) {
      el.hidden = el.getAttribute("data-level") !== String(lvId);
    });

    if (lvId === "end") return;

    var levelEl = qs('article.level[data-level="' + lvId + '"]');
    if (!levelEl) return;

    if (hasArtifact(state, lvId)) {
      qsa(".beat", levelEl).forEach(function (beat) { beat.hidden = false; });
      var next = qs("[data-next]", levelEl);
      if (next) next.hidden = false;
      return;
    }

    showBeat(levelEl, "fail");
    bindLevel(levelEl, lvId, state);
  }

  function afterSave(levelEl, lvId) {
    var state = load();
    renderLamps(qs("#lamps"), state);
    renderRail(qs("#rail"), state, lvId);
    renderDockSlot(qs("#dock-body"), state, lvId);
    showBeat(levelEl, "example");
    qsa(".beat", levelEl).forEach(function (beat) { beat.hidden = false; });
    var next = qs("[data-next]", levelEl);
    if (next) next.hidden = false;
  }


  function pickRight(root) {
    qsa('input[type="radio"][value="right"]', root).forEach(function (node) {
      node.checked = true;
    });
  }

  function fillDo(levelEl, lvId) {
    if (lvId === 0) {
      qs("#do0-nl", levelEl).checked = true;
      qs("#do0-commit", levelEl).checked = true;
      qs("#do0-trap1", levelEl).checked = false;
      qs("#do0-trap2", levelEl).checked = false;
      return;
    }
    if (lvId === 1) {
      qs("#c-who", levelEl).value = "你是仓库里的开发助手，只服务这一条：启用「CI 红了先通知，不要自动发版」。";
      qs("#c-ok", levelEl).value = "规则先以停用草稿落盘；启用必须经过确认坞；CI 红了只发群通知。";
      qs("#c-tools", levelEl).value = "list_pipelines、draft_rule、read_receipt。没有 deploy，没有 commit。";
      qs("#c-ws", levelEl).value = "只读写约定目录。草稿与回执分开。";
      qs("#c-stop", levelEl).value = "缺权限、有人要发版、或偏离通知规则时，写明原因并等待。";
      return;
    }
    if (lvId === 2) {
      var yes = { f_id: "yes", f_rev: "yes", f_status: "yes", f_sum: "yes", f_token: "no", f_key: "no", f_hook: "no" };
      Object.keys(yes).forEach(function (name) {
        var node = document.querySelector('input[name="' + name + '"][value="' + yes[name] + '"]');
        if (node) node.checked = true;
      });
      return;
    }
    if (lvId === 3) {
      qs("#d3-enabled", levelEl).value = "false";
      qs("#d3-target", levelEl).value = "团队群";
      return;
    }
    if (lvId === 4) {
      qs("#dock4-approve", levelEl).value = "批准";
      return;
    }
    if (lvId === 6) {
      qs("#stop-means", levelEl).value = "chat";
      qs("#cancel-means", levelEl).value = "ci";
      qs("#unknown-action", levelEl).value = "reconcile";
    }
  }

  function bindLevel(levelEl, lvId, state) {
    qsa("[data-to]", levelEl).forEach(function (btn) {
      btn.addEventListener("click", function () {
        showBeat(levelEl, btn.getAttribute("data-to"));
      });
    });
    qsa("[data-fill-gate]", levelEl).forEach(function (btn) {
      btn.addEventListener("click", function () {
        pickRight(levelEl);
      });
    });
    qsa("[data-fill-do]", levelEl).forEach(function (btn) {
      btn.addEventListener("click", function () {
        fillDo(levelEl, parseInt(btn.getAttribute("data-fill-do"), 10));
      });
    });

    if (lvId === 0) bind0(levelEl);
    if (lvId === 1) bind1(levelEl);
    if (lvId === 2) bind2(levelEl);
    if (lvId === 3) bind3(levelEl);
    if (lvId === 4) bind4(levelEl);
    if (lvId === 5) bind5(levelEl);
    if (lvId === 6) bind6(levelEl);
  }

  function bind0(levelEl) {
    var gateBtn = qs("#g0-submit", levelEl);
    if (gateBtn) {
      gateBtn.addEventListener("click", function () {
        var a = checkedRight("q0a");
        var b = checkedRight("q0b");
        showHint("h0a", !a);
        showHint("h0b", !b);
        if (a && b) showBeat(levelEl, "do");
      });
    }
    var doBtn = qs("#do0-submit", levelEl);
    if (doBtn) {
      doBtn.addEventListener("click", function () {
        var nl = qs("#do0-nl", levelEl);
        var commit = qs("#do0-commit", levelEl);
        var trap1 = qs("#do0-trap1", levelEl);
        var trap2 = qs("#do0-trap2", levelEl);
        if (!nl.checked || !commit.checked || trap1.checked || trap2.checked) {
          setText("e0", "只勾两件实事：口头确认不是授权；commit 不在工具清单。");
          return;
        }
        setText("e0", "");
        putArtifact(load(), 0,
          "artifact: prologue\n" +
          "nl_confirm: not_authorization\n" +
          "commit_in_tools: false\n" +
          "dock: empty\n" +
          "rule: notify-on-red / disabled"
        );
        afterSave(levelEl, 0);
      });
    }
  }

  function hasNotify(text) {
    return /通知|红了/.test(text);
  }

  function hasNoDeploy(text) {
    return /不(要|能|得|许|可)?自动?发版|禁止发版|勿发版|不要发版|不得发版/.test(text);
  }

  function bind1(levelEl) {
    var gateBtn = qs("#g1-submit", levelEl);
    if (gateBtn) {
      gateBtn.addEventListener("click", function () {
        var a = checkedRight("q1a");
        var b = checkedRight("q1b");
        showHint("h1a", !a);
        showHint("h1b", !b);
        if (a && b) showBeat(levelEl, "do");
      });
    }
    var doBtn = qs("#do1-submit", levelEl);
    if (doBtn) {
      doBtn.addEventListener("click", function () {
        var who = qs("#c-who", levelEl).value.trim();
        var ok = qs("#c-ok", levelEl).value.trim();
        var tools = qs("#c-tools", levelEl).value.trim();
        var ws = qs("#c-ws", levelEl).value.trim();
        var stop = qs("#c-stop", levelEl).value.trim();
        var all = [who, ok, tools, ws, stop];
        if (all.some(function (s) { return !s; })) {
          setText("e1", "五句都要写。空着的那格补上就行。");
          return;
        }
        var blob = all.join("\n");
        if (!hasNotify(blob)) {
          setText("e1", "五句里要写到：启用「红了先通知」。现在写的是测试，不是这道门禁。");
          return;
        }
        if (!hasNoDeploy(blob)) {
          setText("e1", "五句里要写明：不要自动发版。");
          return;
        }
        if (/deploy|发版/.test(tools) && !/不|禁|勿|没/.test(tools)) {
          setText("e1", "工具清单里不能把发版写成可用工具。");
          return;
        }
        setText("e1", "");
        putArtifact(load(), 1,
          "artifact: contract\n" +
          "who: " + who + "\n" +
          "success: " + ok + "\n" +
          "tools: " + tools + "\n" +
          "workspace: " + ws + "\n" +
          "stop: " + stop
        );
        afterSave(levelEl, 1);
      });
    }
  }

  function bind2(levelEl) {
    var gateBtn = qs("#g2-submit", levelEl);
    if (gateBtn) {
      gateBtn.addEventListener("click", function () {
        var a = checkedRight("q2a");
        var b = checkedRight("q2b");
        showHint("h2a", !a);
        showHint("h2b", !b);
        if (a && b) showBeat(levelEl, "do");
      });
    }
    var doBtn = qs("#do2-submit", levelEl);
    if (doBtn) {
      doBtn.addEventListener("click", function () {
        var expect = {
          f_id: "yes",
          f_rev: "yes",
          f_status: "yes",
          f_sum: "yes",
          f_token: "no",
          f_key: "no",
          f_hook: "no"
        };
        var bad = Object.keys(expect).some(function (name) {
          var node = document.querySelector('input[name="' + name + '"]:checked');
          return !node || node.value !== expect[name];
        });
        if (bad) {
          setText("e2", "可投影：id / revision / status / summary。令牌、私钥、密钥留下。");
          return;
        }
        setText("e2", "");
        putArtifact(load(), 2,
          "artifact: projection\n" +
          "allow: id, revision, status, summary\n" +
          "deny: deploy_token, private_key, webhook_secret"
        );
        afterSave(levelEl, 2);
      });
    }
  }

  function bind3(levelEl) {
    var wrote = false;
    var gateBtn = qs("#g3-submit", levelEl);
    if (gateBtn) {
      gateBtn.addEventListener("click", function () {
        var a = checkedRight("q3a");
        var b = checkedRight("q3b");
        showHint("h3a", !a);
        showHint("h3b", !b);
        if (a && b) showBeat(levelEl, "do");
      });
    }
    var doBtn = qs("#do3-submit", levelEl);
    if (doBtn) {
      doBtn.addEventListener("click", function () {
        if (wrote) {
          setText("e3", "本回合已经写过。一回合一次写。");
          return;
        }
        var enabled = qs("#d3-enabled", levelEl).value;
        var target = qs("#d3-target", levelEl).value.trim();
        if (enabled !== "false") {
          setText("e3", "先写成停用。启用要等确认坞。");
          return;
        }
        if (!target) {
          setText("e3", "通知对象要写上。");
          return;
        }
        wrote = true;
        setText("e3", "");
        putArtifact(load(), 3,
          "artifact: draft-receipt\n" +
          "rule_id: rule-ci-notify\n" +
          "revision: r1\n" +
          "enabled: false\n" +
          "notify: " + target + "\n" +
          "writes_this_turn: 1"
        );
        afterSave(levelEl, 3);
      });
    }
  }

  function bind4(levelEl) {
    var gateBtn = qs("#g4-submit", levelEl);
    if (gateBtn) {
      gateBtn.addEventListener("click", function () {
        var a = checkedRight("q4a");
        var b = checkedRight("q4b");
        showHint("h4a", !a);
        showHint("h4b", !b);
        if (a && b) showBeat(levelEl, "do");
      });
    }
    var chatSend = qs("#chat4-send", levelEl);
    if (chatSend) {
      chatSend.addEventListener("click", function () {
        var input = qs("#chat4-input", levelEl);
        var log = qs("#chat4-log", levelEl);
        var text = (input.value || "").trim() || "开了";
        var you = document.createElement("div");
        you.className = "bubble";
        you.innerHTML = "<span>你</span><p></p>";
        you.querySelector("p").textContent = text;
        log.appendChild(you);
        var bot = document.createElement("div");
        bot.className = "bubble";
        bot.innerHTML = "<span>模型</span><p>好了。</p>";
        log.appendChild(bot);
        var sys = document.createElement("div");
        sys.className = "bubble sys";
        sys.innerHTML = "<span>规则</span><p>notify-on-red · 仍停用。commit 不在工具清单。</p>";
        log.appendChild(sys);
        input.value = "";
      });
    }
    var doBtn = qs("#do4-submit", levelEl);
    if (doBtn) {
      doBtn.addEventListener("click", function () {
        var typed = (qs("#dock4-approve", levelEl).value || "").trim();
        if (typed !== "批准") {
          setText("e4", "确认坞要键入「批准」。聊天里的「开了」不算。");
          return;
        }
        setText("e4", "");
        putArtifact(load(), 4,
          "artifact: dock-approve\n" +
          "typed: 批准\n" +
          "rule: CI 红了先通知，不要自动发版\n" +
          "revision: r1\n" +
          "commit_by: human\n" +
          "model_commit: false"
        );
        afterSave(levelEl, 4);
      });
    }
  }

  function bind5(levelEl) {
    var gateBtn = qs("#g5-submit", levelEl);
    if (gateBtn) {
      gateBtn.addEventListener("click", function () {
        var a = checkedRight("q5a");
        var b = checkedRight("q5b");
        showHint("h5a", !a);
        showHint("h5b", !b);
        if (a && b) showBeat(levelEl, "do");
      });
    }
    var failBtn = qs("#do5-old", levelEl);
    if (failBtn) {
      failBtn.addEventListener("click", function () {
        setText("e5", "旧 token 对不上 r2。启用同事的配置，算失败。");
      });
    }
    var okBtn = qs("#do5-void", levelEl);
    if (okBtn) {
      okBtn.addEventListener("click", function () {
        setText("e5", "");
        putArtifact(load(), 5,
          "artifact: mismatch-receipt\n" +
          "approved_revision: r1\n" +
          "current_revision: r2\n" +
          "approved: notify=团队群 branch=release\n" +
          "current: notify=全员 branch=main\n" +
          "token: revoked\n" +
          "enable_colleague_config: refused"
        );
        afterSave(levelEl, 5);
      });
    }
  }

  function bind6(levelEl) {
    var gateBtn = qs("#g6-submit", levelEl);
    if (gateBtn) {
      gateBtn.addEventListener("click", function () {
        var a = checkedRight("q6a");
        var b = checkedRight("q6b");
        showHint("h6a", !a);
        showHint("h6b", !b);
        if (a && b) showBeat(levelEl, "do");
      });
    }
    var doBtn = qs("#do6-submit", levelEl);
    if (doBtn) {
      doBtn.addEventListener("click", function () {
        var stop = qs("#stop-means", levelEl).value;
        var cancel = qs("#cancel-means", levelEl).value;
        var unknown = qs("#unknown-action", levelEl).value;
        if (stop !== "chat" || cancel !== "ci") {
          setText("e6", "停止生成只停聊天回合。取消 CI 是另一条命令。");
          return;
        }
        if (unknown !== "reconcile") {
          setText("e6", "unknown 按 intent id 对账。不要再写一条，也不要 2PC。");
          return;
        }
        setText("e6", "");
        putArtifact(load(), 6,
          "artifact: reconcile\n" +
          "stop_generate: chat_turn_only\n" +
          "cancel_ci: separate_command\n" +
          "intent_id: int-7\n" +
          "unknown: converged\n" +
          "twopc: false"
        );
        afterSave(levelEl, 6);
      });
    }
  }

  var page = document.body.getAttribute("data-page");
  if (page === "map") initMap();
  if (page === "play") initPlay();
  if (page === "appendix") {
    var params = new URLSearchParams(window.location.search);
    var mapEl = document.getElementById("appendix-map");
    var chrome = document.getElementById("lamps");
    var playWrap = document.getElementById("appendix-play");
    if (params.has("lv")) {
      if (mapEl) mapEl.hidden = true;
      if (chrome) chrome.hidden = false;
      if (playWrap) playWrap.hidden = false;
      initPlay();
    } else {
      if (mapEl) mapEl.hidden = false;
      if (chrome) chrome.hidden = true;
      if (playWrap) playWrap.hidden = true;
      var mapDock = document.getElementById("dock-body-map");
      if (mapDock && !document.getElementById("dock-body")) {
        mapDock.id = "dock-body";
      } else if (mapDock) {
        var state = load();
        renderLamps(document.getElementById("lamps"), state);
        renderMap(document.getElementById("trail"), state);
        renderDockList(mapDock, state);
        var reset = document.getElementById("reset-campaign");
        if (reset) {
          reset.addEventListener("click", function () {
            if (!window.confirm("清空本机证物，从第 0 关重开？")) return;
            clearAll();
            window.location.reload();
          });
        }
      } else {
        initMap();
      }
    }
  }
})();
