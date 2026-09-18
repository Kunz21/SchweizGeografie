/* =========================================================
   TaskBank — generiert Aufgaben (Multiple Choice, Karten-Klick,
   Markierung) aus den Geodaten und prüft Antworten.

   Neue Aufgaben hinzufügen = Daten in data/*.json ergänzen,
   nicht diese Datei anfassen. Neue AUFGABENTYPEN oder neue
   THEMEN (z.B. Flüsse einzeichnen, sobald Liniendaten
   vorhanden sind) kommen als neue generate*()-Funktion dazu.
   ========================================================= */

const TaskBank = (() => {
  let cantons = {};
  let lakes = {};
  let rivers = {};
  let stations = {};

  function init(data) {
    cantons = data.cantons;
    lakes = data.lakes;
    rivers = data.rivers;
    stations = data.stations;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickRandom(arr, n, excludeIndex) {
    const pool = excludeIndex === undefined ? [...arr] : arr.filter((_, i) => i !== excludeIndex);
    return shuffle(pool).slice(0, n);
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function buildMc({ question, hint, correctLabel, distractorLabels }) {
    const correctId = uid();
    const options = [{ id: correctId, label: correctLabel }];
    distractorLabels.forEach((label) => options.push({ id: uid(), label }));
    return {
      id: uid(),
      type: "mc",
      question,
      hint,
      options: shuffle(options),
      correctOptionId: correctId,
    };
  }

  // ---------- CANTONS ----------

  function cantonTasks() {
    const list = Object.values(cantons);
    const tasks = [];

    list.forEach((c, i) => {
      // MC: capital of canton
      const distractors = pickRandom(list, 3, i).map((o) => o.capital);
      tasks.push({
        ...buildMc({
          question: `Was ist der Hauptort des Kantons ${c.name}?`,
          correctLabel: c.capital,
          distractorLabels: distractors,
        }),
        category: "cantons",
      });

      // map-select: click the canton
      tasks.push({
        id: uid(),
        type: "map-select",
        category: "cantons",
        question: `Klicke auf den Kanton ${c.name} (${c.abbr}) auf der Karte.`,
        targetType: "canton",
        targetId: c.abbr,
        targetLabel: c.name,
      });

      // map-pin: mark the capital
      tasks.push({
        id: uid(),
        type: "map-pin",
        category: "cantons",
        question: `Markiere ungefähr, wo der Hauptort ${c.capital} (Kanton ${c.name}) liegt.`,
        hint: "Toleranzradius: Klick muss nur ungefähr stimmen.",
        targetXY: c.centroid,
        toleranceRadius: 34,
        targetLabel: c.capital,
      });
    });

    return tasks;
  }

  // ---------- LAKES ----------

  function lakeTasks() {
    const list = Object.values(lakes);
    const tasks = [];

    list.forEach((l, i) => {
      // MC: area
      const distractors = pickRandom(list, 3, i).map((o) => `≈ ${o.area_km2} km²`);
      tasks.push({
        ...buildMc({
          question: `Wie gross ist der ${l.name} ungefähr (Fläche)?`,
          correctLabel: `≈ ${l.area_km2} km²`,
          distractorLabels: distractors,
        }),
        category: "lakes",
      });

      // MC: bordering cantons
      const distractorCantons = pickRandom(list, 3, i).map((o) => o.cantons);
      tasks.push({
        ...buildMc({
          question: `An welche Kantone grenzt der ${l.name}?`,
          correctLabel: l.cantons,
          distractorLabels: distractorCantons,
        }),
        category: "lakes",
      });

      // map-select: click the lake
      tasks.push({
        id: uid(),
        type: "map-select",
        category: "lakes",
        question: `Klicke auf den ${l.name} auf der Karte.`,
        targetType: "lake",
        targetId: l.slug,
        targetLabel: l.name,
      });

      // map-pin: mark the lake's approximate centre
      tasks.push({
        id: uid(),
        type: "map-pin",
        category: "lakes",
        question: `Markiere die ungefähre Lage des ${l.name}.`,
        targetXY: l.centroid,
        toleranceRadius: 38,
        targetLabel: l.name,
      });
    });

    return tasks;
  }

  // ---------- RIVERS (noch ohne Liniengeometrie -> nur MC) ----------

  function riverTasks() {
    const list = Object.values(rivers);
    const tasks = [];

    list.forEach((r, i) => {
      const distractorsSource = pickRandom(list, 3, i).map((o) => o.quelle);
      tasks.push({
        ...buildMc({
          question: `Wo entspringt die ${r.name}?`,
          correctLabel: r.quelle,
          distractorLabels: distractorsSource,
        }),
        category: "rivers",
      });

      const distractorsMouth = pickRandom(list, 3, i).map((o) => o.muendung);
      tasks.push({
        ...buildMc({
          question: `Wo mündet die ${r.name}?`,
          correctLabel: r.muendung,
          distractorLabels: distractorsMouth,
        }),
        category: "rivers",
      });

      const distractorsLength = pickRandom(list, 3, i).map((o) => `≈ ${o.length_ch_km} km`);
      tasks.push({
        ...buildMc({
          question: `Wie lang ist die ${r.name} auf Schweizer Boden ungefähr?`,
          correctLabel: `≈ ${r.length_ch_km} km`,
          distractorLabels: distractorsLength,
        }),
        category: "rivers",
      });
    });

    return tasks;
  }

  // ---------- STATIONS ----------

  function stationTasks() {
    const list = Object.values(stations);
    const tasks = [];

    list.forEach((s, i) => {
      const distractors = pickRandom(list, 3, i).map((o) => o.kanton);
      tasks.push({
        ...buildMc({
          question: `In welchem Kanton liegt der Bahnhof ${s.name}?`,
          correctLabel: s.kanton,
          distractorLabels: distractors,
        }),
        category: "stations",
      });

      tasks.push({
        id: uid(),
        type: "map-pin",
        category: "stations",
        question: `Markiere den Bahnhof ${s.name} auf der Karte.`,
        hint: "Näherungswert – Feintuning der Koordinaten folgt.",
        targetXY: s.centroid,
        toleranceRadius: 30,
        targetLabel: s.name,
      });
    });

    return tasks;
  }

  const GENERATORS = {
    cantons: cantonTasks,
    lakes: lakeTasks,
    rivers: riverTasks,
    stations: stationTasks,
  };

  // Welche Aufgabentypen sind je Thema überhaupt möglich (steuert die UI-Tabs)
  const AVAILABLE_TYPES = {
    cantons: ["mc", "map-select", "map-pin"],
    lakes: ["mc", "map-select", "map-pin"],
    rivers: ["mc"],
    stations: ["mc", "map-pin"],
  };

  function generate(category, taskType, count) {
    const all = GENERATORS[category]().filter((t) => t.type === taskType);
    return shuffle(all).slice(0, Math.min(count, all.length));
  }

  function availableTypes(category) {
    return AVAILABLE_TYPES[category];
  }

  function checkMc(task, optionId) {
    return optionId === task.correctOptionId;
  }

  function checkMapSelect(task, clicked) {
    return clicked.type === task.targetType && clicked.id === task.targetId;
  }

  function checkMapPin(task, clickXY) {
    const [tx, ty] = task.targetXY;
    const dist = Math.hypot(clickXY.x - tx, clickXY.y - ty);
    return dist <= task.toleranceRadius;
  }

  return {
    init,
    generate,
    availableTypes,
    checkMc,
    checkMapSelect,
    checkMapPin,
  };
})();
