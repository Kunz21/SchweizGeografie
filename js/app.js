/* =========================================================
   App — verbindet UI, ChMap und TaskBank.
   ========================================================= */

(function () {
  const CATEGORY_LABELS = {
    cantons: "Kantone",
    lakes: "Seen",
    rivers: "Flüsse",
    stations: "Bahnhöfe",
  };
  const TYPE_LABELS = {
    mc: "Auswahl",
    "map-select": "Karte klicken",
    "map-pin": "Markieren",
  };
  const ALL_TYPES = ["mc", "map-select", "map-pin"];
  const QUEUE_SIZE = 8;

  const state = {
    category: "cantons",
    taskType: "mc",
    queue: [],
    idx: 0,
    answered: false,
    score: { correct: 0, total: 0 },
  };

  const el = {
    categoryTabs: document.getElementById("category-tabs"),
    typeTabs: document.getElementById("tasktype-tabs"),
    taskPanel: document.getElementById("task-panel"),
    progressFill: document.getElementById("progress-fill"),
    scoreValue: document.getElementById("score-value"),
    scoreTotal: document.getElementById("score-total"),
    mapCaption: document.getElementById("map-caption"),
  };

  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error("Konnte " + path + " nicht laden (Status " + res.status + ")");
    return res.json();
  }

  async function boot() {
    try {
      const [cantons, lakes, rivers, stations] = await Promise.all([
        loadJSON("data/cantons.json"),
        loadJSON("data/lakes.json"),
        loadJSON("data/rivers.json"),
        loadJSON("data/stations.json"),
      ]);

      ChMap.init({ cantons, lakes });
      TaskBank.init({ cantons, lakes, rivers, stations });

      buildCategoryTabs();
      buildTypeTabs();
      startQueue();
    } catch (err) {
      el.taskPanel.innerHTML =
        '<p class="feedback is-wrong">Daten konnten nicht geladen werden: ' +
        escapeHtml(err.message) +
        ". Läuft die Seite über einen lokalen Server (nicht per Doppelklick als Datei)? Siehe README.</p>";
      console.error(err);
    }
  }

  function buildCategoryTabs() {
    el.categoryTabs.innerHTML = "";
    Object.keys(CATEGORY_LABELS).forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "tab-btn";
      btn.textContent = CATEGORY_LABELS[cat];
      btn.setAttribute("aria-pressed", String(cat === state.category));
      btn.addEventListener("click", () => {
        if (cat === state.category) return;
        state.category = cat;
        const avail = TaskBank.availableTypes(cat);
        if (!avail.includes(state.taskType)) state.taskType = avail[0];
        [...el.categoryTabs.children].forEach((b) =>
          b.setAttribute("aria-pressed", String(b === btn))
        );
        buildTypeTabs();
        startQueue();
      });
      el.categoryTabs.appendChild(btn);
    });
  }

  function buildTypeTabs() {
    const avail = TaskBank.availableTypes(state.category);
    el.typeTabs.innerHTML = "";
    ALL_TYPES.forEach((type) => {
      const btn = document.createElement("button");
      btn.className = "tab-btn";
      btn.textContent = TYPE_LABELS[type];
      const isAvail = avail.includes(type);
      btn.disabled = !isAvail;
      btn.setAttribute("aria-pressed", String(type === state.taskType && isAvail));
      if (isAvail) {
        btn.addEventListener("click", () => {
          if (type === state.taskType) return;
          state.taskType = type;
          [...el.typeTabs.children].forEach((b) =>
            b.setAttribute("aria-pressed", String(b === btn))
          );
          startQueue();
        });
      }
      el.typeTabs.appendChild(btn);
    });
  }

  function startQueue() {
    state.queue = TaskBank.generate(state.category, state.taskType, QUEUE_SIZE);
    state.idx = 0;
    ChMap.clearPins();
    ChMap.clearHighlights();
    renderTask();
  }

  function updateProgress() {
    const pct = state.queue.length ? (state.idx / state.queue.length) * 100 : 0;
    el.progressFill.style.width = pct + "%";
  }

  function updateScore() {
    el.scoreValue.textContent = state.score.correct;
    el.scoreTotal.textContent = state.score.total;
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function renderTask() {
    ChMap.clearPins();
    ChMap.clearHighlights();
    ChMap.setMode("view");
    updateProgress();

    if (state.idx >= state.queue.length) {
      renderSummary();
      return;
    }

    const task = state.queue[state.idx];
    state.answered = false;
    const kicker = `${TYPE_LABELS[task.type].toUpperCase()} · ${CATEGORY_LABELS[task.category].toUpperCase()}`;

    if (task.type === "mc") {
      el.taskPanel.innerHTML = `
        <div class="task-meta"><span class="task-kicker">${kicker}</span><span>Aufgabe ${state.idx + 1} / ${state.queue.length}</span></div>
        <p class="task-question">${escapeHtml(task.question)}</p>
        <div class="mc-options" id="mc-options"></div>
        <div id="feedback-slot"></div>
        <div class="task-actions">
          <button class="btn btn-ghost" id="btn-skip">Überspringen</button>
          <button class="btn" id="btn-next" disabled>Weiter →</button>
        </div>`;
      const optWrap = document.getElementById("mc-options");
      task.options.forEach((opt) => {
        const b = document.createElement("button");
        b.className = "mc-option";
        b.textContent = opt.label;
        b.addEventListener("click", () => {
          if (state.answered) return;
          state.answered = true;
          const correct = TaskBank.checkMc(task, opt.id);
          [...optWrap.children].forEach((c) => (c.disabled = true));
          b.classList.add(correct ? "is-correct" : "is-wrong");
          if (!correct) {
            const correctBtn = [...optWrap.children].find(
              (c) => c.textContent === task.options.find((o) => o.id === task.correctOptionId).label
            );
            if (correctBtn) correctBtn.classList.add("is-correct");
          }
          registerAnswer(correct);
          showFeedback(correct, correct ? "Richtig." : "Leider falsch.");
        });
        optWrap.appendChild(b);
      });
    } else if (task.type === "map-select") {
      el.taskPanel.innerHTML = `
        <div class="task-meta"><span class="task-kicker">${kicker}</span><span>Aufgabe ${state.idx + 1} / ${state.queue.length}</span></div>
        <p class="task-question">${escapeHtml(task.question)}</p>
        <p class="task-hint">Klicke direkt auf die Karte rechts.</p>
        <div id="feedback-slot"></div>
        <div class="task-actions">
          <button class="btn btn-ghost" id="btn-skip">Überspringen</button>
          <button class="btn" id="btn-next" disabled>Weiter →</button>
        </div>`;
      ChMap.setMode(task.targetType === "canton" ? "select-canton" : "select-lake");
      ChMap.onShapeClick((clicked) => {
        if (state.answered) return;
        state.answered = true;
        const correct = TaskBank.checkMapSelect(task, clicked);
        ChMap.highlightShape(clicked.type, clicked.id, correct ? "is-target-hit" : "is-target-miss");
        if (!correct) ChMap.highlightShape(task.targetType, task.targetId, "is-target-hit");
        ChMap.setMode("view");
        registerAnswer(correct);
        showFeedback(
          correct,
          correct ? "Richtig getroffen." : `Das war ${clicked.name}. Gesucht war ${task.targetLabel}.`
        );
      });
    } else if (task.type === "map-pin") {
      el.taskPanel.innerHTML = `
        <div class="task-meta"><span class="task-kicker">${kicker}</span><span>Aufgabe ${state.idx + 1} / ${state.queue.length}</span></div>
        <p class="task-question">${escapeHtml(task.question)}</p>
        <p class="task-hint">${task.hint ? escapeHtml(task.hint) + " " : ""}Klicke auf die ungefähre Position auf der Karte.</p>
        <div id="feedback-slot"></div>
        <div class="task-actions">
          <button class="btn btn-ghost" id="btn-skip">Überspringen</button>
          <button class="btn" id="btn-next" disabled>Weiter →</button>
        </div>`;
      ChMap.setMode("pin");
      ChMap.onMapPointClick((xy) => {
        if (state.answered) return;
        state.answered = true;
        const hit = TaskBank.checkMapPin(task, xy);
        ChMap.showPinResult(xy, task.targetXY, task.toleranceRadius, hit, task.targetLabel);
        ChMap.setMode("view");
        registerAnswer(hit);
        showFeedback(hit, hit ? "Nah genug dran — richtig." : `Zu weit weg. Gesucht war ${task.targetLabel}.`);
      });
    }

    document.getElementById("btn-skip").addEventListener("click", () => {
      state.idx++;
      renderTask();
    });
    document.getElementById("btn-next").addEventListener("click", () => {
      state.idx++;
      renderTask();
    });
  }

  function showFeedback(correct, message) {
    const slot = document.getElementById("feedback-slot");
    if (slot) {
      slot.innerHTML = `<div class="feedback ${correct ? "is-correct" : "is-wrong"}">${escapeHtml(message)}</div>`;
    }
    const nextBtn = document.getElementById("btn-next");
    if (nextBtn) nextBtn.disabled = false;
    const skipBtn = document.getElementById("btn-skip");
    if (skipBtn) skipBtn.disabled = true;
  }

  function registerAnswer(correct) {
    state.score.total++;
    if (correct) state.score.correct++;
    updateScore();
  }

  function renderSummary() {
    el.taskPanel.innerHTML = `
      <div class="summary">
        <span class="task-kicker">FERTIG · ${CATEGORY_LABELS[state.category].toUpperCase()}</span>
        <div class="big-number">${state.score.correct} / ${state.score.total}</div>
        <p>richtig in dieser Runde (${TYPE_LABELS[state.taskType]}).</p>
        <button class="btn" id="btn-restart">Neue Runde starten</button>
      </div>`;
    document.getElementById("btn-restart").addEventListener("click", startQueue);
    el.progressFill.style.width = "100%";
  }

  boot();
})();
