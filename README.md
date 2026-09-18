# Kartenkunde Schweiz 🇨🇭

Interaktive Lern-App für Schweizer Geographie: **Kantone & Hauptorte**, **Seen**,
**Flüsse** und **Knotenbahnhöfe**. Aufgaben gibt es in drei Varianten:

- **Auswahl** – klassisches Multiple Choice
- **Karte klicken** – die richtige Fläche (Kanton oder See) direkt auf der Karte anklicken
- **Markieren** – die ungefähre Position (Hauptort, See, Bahnhof) auf der Karte anklicken (Toleranzradius)

Reines Vanilla-JS/HTML/CSS, keine Build-Tools, keine Abhängigkeiten. Läuft als
statische Seite überall dort, wo man Dateien hosten kann — inklusive **GitHub Pages**.

## Schnellstart

Browser blockieren `fetch()` auf lokale Dateien über `file://`. Die Seite deshalb
**über einen kleinen lokalen Server** öffnen, nicht per Doppelklick auf `index.html`:

```bash
# Variante 1: Python (meist vorinstalliert)
python3 -m http.server 8000
# dann im Browser: http://localhost:8000

# Variante 2: Node
npx serve .
```

## Auf GitHub veröffentlichen

```bash
git init
git add .
git commit -m "Kartenkunde Schweiz – erste Version"
git branch -M main
git remote add origin <DEIN-REPO-URL>
git push -u origin main
```

Danach unter *Settings → Pages* den Branch `main` (Ordner `/`) aktivieren –
fertig ist die gehostete Lern-App.

## Projektstruktur

```
index.html              Seiten-Grundgerüst
css/style.css            Design (Schweizer Signaletik-Stil: Haarlinien, scharfe Kanten,
                          Rot als Funktionsfarbe – siehe Abschnitt "Design" unten)
js/map.js                 Zeichnet die SVG-Karte aus den Geo-Daten, Klick-Handling,
                          Pin/Marker-Logik
js/tasks.js               Generiert Aufgaben aus den Daten + prüft Antworten
js/app.js                  Verbindet UI, Karte und Aufgabenlogik
data/cantons.json         26 Kantone: Name, Hauptort, Flächenschwerpunkt, SVG-Pfad
data/lakes.json           12 grösste identifizierte Seen: Name, Fläche, Kantone, SVG-Pfad
data/rivers.json          6 grösste Flüsse: Quelle, Mündung, Länge, Kantone (noch ohne Geometrie)
data/stations.json        10 Knotenbahnhöfe: Kanton, Näherungs-Koordinate
```

**Neue Aufgaben oder Inhalte hinzufügen bedeutet fast immer nur: JSON-Datei
ergänzen.** Die Aufgaben werden zur Laufzeit aus den Daten generiert
(`js/tasks.js`), nicht hart codiert.

## Woher kommen die Geo-Daten?

Die Kantons- und Seeflächen (SVG-Pfade in `data/cantons.json` / `data/lakes.json`)
stammen aus echten, offen lizenzierten Geodaten:

- **Quelle:** [github.com/greenore/swiss-maps](https://github.com/greenore/swiss-maps)
  (TopoJSON, abgeleitet aus swisstopo `swissBOUNDARIES3D` 2014)
- **Lizenz:** Geodaten © swisstopo, freie Geodaten-Lizenz des Bundesamts für
  Landestopografie; Code/Aufbereitung BSD-lizenziert. Siehe Lizenztexte im
  Quell-Repository.
- Die Seen wurden anhand von Fläche, Lage und benachbarten Kantonen den
  bekannten Namen zugeordnet (Skript nicht Teil dieses Repos, aber die Logik
  ist unten unter "Nachvollziehbarkeit" beschrieben).

Flüsse und Bahnhofskoordinaten sind **keine** offiziellen Geodaten, sondern für
diese erste Version bewusst vereinfacht (siehe "Offene Punkte").

## Offene Punkte / nächste Schritte

Das hier ist bewusst eine **Hülle mit ersten Aufgaben**, kein fertiges
Endprodukt. Konkrete nächste Schritte, sortiert nach Aufwand:

1. **Bahnhof-Koordinaten präzisieren.** Aktuell teils vom Kantons-Flächenschwerpunkt
   oder von See-Uferpunkten abgeleitet (z. B. Zürich HB = Nordspitze Zürichsee).
   Chur ist eine grobe Schätzung. Echte Koordinaten gibt es z. B. bei
   [opendata.swiss](https://opendata.swiss) (SBB-Haltestellen) oder direkt bei
   [data.sbb.ch](https://data.sbb.ch).
2. **Flüsse auf der Karte einzeichnen.** Aktuell nur Multiple-Choice-Fakten
   (Quelle/Mündung/Länge), da keine Linien-Geometrie vorliegt. Eine
   Fluss-Liniendatei (z. B. aus swisstopo VECTOR25 oder Natural-Earth-Rivers)
   würde `map-select`/`map-pin`-Aufgaben für Flüsse ermöglichen –
   `js/tasks.js` ist bereits so gebaut, dass ein neuer Aufgabentyp `map-line`
   sich einfach ergänzen lässt.
3. **Weitere Seen/Bahnhöfe/Kantonsdetails** (Einwohnerzahl, Fläche, Wappen …)
   ergänzen – einfach neue Felder in den JSON-Dateien plus eine neue
   `build...Task()`-Funktion in `js/tasks.js`.
4. **Echtes "Freihand einzeichnen"** (z. B. Kantonsgrenzen selbst nachzeichnen)
   wäre ein eigener, deutlich komplexerer Aufgabentyp (Canvas/Pfad-Vergleich) –
   aktuell bewusst durch die einfachere "Markieren"-Variante (Punkt + Toleranz)
   abgedeckt.
5. **Mehrere Themen gleichzeitig üben** (Mischmodus) statt nur ein Thema pro Runde.
6. Tests, Barrierefreiheits-Feinschliff, Highscore-Speicherung (`localStorage`).

## Design

Angelehnt an die Schweizer Signaletik/Raster-Tradition: flache Flächen,
Haarlinien statt Schatten, scharfe Kanten, Rot als Funktionsfarbe (analog zu
SBB-Wegweisern), Systemschrift (Helvetica/Arial) plus eine Mono-Schrift für
Zahlen/Score – als kleine Anspielung auf Bahnhofs-Abfahrtstafeln.

## Lizenz

Code: MIT (frei anpassbar). Geodaten: siehe oben – swisstopo-Lizenzbedingungen
beachten, wenn du das Projekt weiterverbreitest.
