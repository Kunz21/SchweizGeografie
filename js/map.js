/* =========================================================
   ChMap — zeichnet die Schweizer Karte (Kantone + Seen) aus
   den JSON-Geodaten und stellt Klick-Interaktionen bereit.

   Koordinatensystem: 960 x 500 (identisch mit den Pfaddaten
   in data/cantons.json / data/lakes.json).
   ========================================================= */

const ChMap = (() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  let svgEl, layerCantons, layerLakes, layerLabels, layerPins;
  let cantonData = {};
  let lakeData = {};

  let mode = "view"; // 'view' | 'select-canton' | 'select-lake' | 'pin'
  let shapeClickHandler = null;
  let pointClickHandler = null;

  function init({ cantons, lakes }) {
    cantonData = cantons;
    lakeData = lakes;

    svgEl = document.getElementById("ch-map");
    layerCantons = document.getElementById("layer-cantons");
    layerLakes = document.getElementById("layer-lakes");
    layerLabels = document.getElementById("layer-labels");
    layerPins = document.getElementById("layer-pins");

    drawCantons();
    drawLakes();

    svgEl.addEventListener("click", onSvgClick);
  }

  function drawCantons() {
    layerCantons.innerHTML = "";
    Object.values(cantonData).forEach((c) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", c.path);
      path.setAttribute("fill-rule", "evenodd");
      path.setAttribute("class", "map-shape");
      path.dataset.type = "canton";
      path.dataset.id = c.abbr;
      path.dataset.name = c.name;
      path.setAttribute("tabindex", "0");
      path.setAttribute("role", "button");
      path.setAttribute("aria-label", "Kanton " + c.name);
      layerCantons.appendChild(path);
    });
  }

  function drawLakes() {
    layerLakes.innerHTML = "";
    Object.values(lakeData).forEach((l) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", l.path);
      path.setAttribute("fill-rule", "evenodd");
      path.setAttribute("class", "map-shape is-lake");
      path.dataset.type = "lake";
      path.dataset.id = l.slug;
      path.dataset.name = l.name;
      path.setAttribute("tabindex", "0");
      path.setAttribute("role", "button");
      path.setAttribute("aria-label", "See " + l.name);
      layerLakes.appendChild(path);
    });
  }

  function setMode(next) {
    mode = next;
    const interactive = mode === "select-canton" || mode === "select-lake";
    [...layerCantons.children].forEach((p) => {
      p.classList.toggle("is-disabled", mode !== "select-canton");
    });
    [...layerLakes.children].forEach((p) => {
      p.classList.toggle("is-disabled", mode !== "select-lake");
    });
    svgEl.style.cursor = mode === "pin" ? "crosshair" : "default";
  }

  function onSvgClick(evt) {
    const target = evt.target;
    if (target && target.classList && target.classList.contains("map-shape")) {
      if (
        (mode === "select-canton" && target.dataset.type === "canton") ||
        (mode === "select-lake" && target.dataset.type === "lake")
      ) {
        if (shapeClickHandler) {
          shapeClickHandler({
            type: target.dataset.type,
            id: target.dataset.id,
            name: target.dataset.name,
            el: target,
          });
        }
        return;
      }
      // clicked a shape while in pin mode: still resolve to a point click
      if (mode === "pin") {
        const pt = clientToViewBox(evt.clientX, evt.clientY);
        if (pointClickHandler) pointClickHandler(pt);
        return;
      }
      return;
    }
    if (mode === "pin") {
      const pt = clientToViewBox(evt.clientX, evt.clientY);
      if (pointClickHandler) pointClickHandler(pt);
    }
  }

  function clientToViewBox(clientX, clientY) {
    const rect = svgEl.getBoundingClientRect();
    const vb = svgEl.viewBox.baseVal;
    const x = ((clientX - rect.left) / rect.width) * vb.width + vb.x;
    const y = ((clientY - rect.top) / rect.height) * vb.height + vb.y;
    return { x, y };
  }

  function onShapeClick(cb) {
    shapeClickHandler = cb;
  }

  function onMapPointClick(cb) {
    pointClickHandler = cb;
  }

  function clearHighlights() {
    [...layerCantons.children, ...layerLakes.children].forEach((p) => {
      p.classList.remove("is-target-hit", "is-target-miss");
    });
  }

  function highlightShape(type, id, cls) {
    const layer = type === "canton" ? layerCantons : layerLakes;
    const el = [...layer.children].find((p) => p.dataset.id === id);
    if (el) el.classList.add(cls);
    return el;
  }

  function clearPins() {
    layerPins.innerHTML = "";
  }

  function drawPin(x, y, kind, label) {
    // kind: 'target' | 'correct' | 'wrong'
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "map-pin " + kind);
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("class", "dot");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", 4.5);
    g.appendChild(dot);
    if (label) {
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", x + 7);
      text.setAttribute("y", y - 6);
      text.setAttribute("class", "map-label");
      text.textContent = label;
      g.appendChild(text);
    }
    layerPins.appendChild(g);
    return g;
  }

  function drawToleranceRing(x, y, radius, kind) {
    const g = layerPins.lastElementChild;
    const ring = document.createElementNS(SVG_NS, "circle");
    ring.setAttribute("class", "ring");
    ring.setAttribute("cx", x);
    ring.setAttribute("cy", y);
    ring.setAttribute("r", radius);
    if (g) g.insertBefore(ring, g.firstChild);
  }

  /** Zeigt das Ergebnis einer Pin-Aufgabe: Klickpunkt + Zielpunkt + Toleranzradius. */
  function showPinResult(clickXY, targetXY, radius, hit, targetLabel) {
    clearPins();
    drawPin(clickXY.x, clickXY.y, hit ? "correct" : "wrong");
    drawToleranceRing(clickXY.x, clickXY.y, radius, hit ? "correct" : "wrong");
    if (!hit) {
      drawPin(targetXY[0], targetXY[1], "target", targetLabel);
    }
  }

  function getCanton(abbr) {
    return cantonData[abbr];
  }
  function getLake(slug) {
    return lakeData[slug];
  }
  function allCantons() {
    return Object.values(cantonData);
  }
  function allLakes() {
    return Object.values(lakeData);
  }

  return {
    init,
    setMode,
    onShapeClick,
    onMapPointClick,
    clearHighlights,
    highlightShape,
    clearPins,
    drawPin,
    showPinResult,
    getCanton,
    getLake,
    allCantons,
    allLakes,
  };
})();
