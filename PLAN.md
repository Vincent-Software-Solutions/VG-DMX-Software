# DMXControl — Projektplan

Eigene DMX-Steuerungssoftware (Daslight-5-Style), free & nur für den persönlichen Gebrauch.
Hardware: **DSD TECH USB→DMX Adapter**. UI: **Dark Mode, clean, komplett deutsch.**

Stack: **Electron + React + TypeScript + Vite**. DMX via Node `dmx` (Treiber `enttec-open-usb-dmx`).

Status: **Plan-Phase, noch nicht gebaut.**

---

## ⚠️ Wichtigster technischer Punkt: der Adapter

Der DSD TECH USB→DMX ist ein **FTDI-basierter "Open DMX USB"-Typ** (FT232 + RS485,
**ohne Timing-Microcontroller**):

- Meldet sich als **serielle FTDI-Schnittstelle** (nicht Enttec-Pro).
- **DMX-Timing in Software**: pro Frame *Break* → *Mark-After-Break* → Startbyte `0x00` →
  bis zu **512 Kanäle**, **250.000 Baud, 8N2**, ~**40× pro Sekunde** in Endlosschleife.
- **FTDI latency timer auf 1 ms**, sonst Flackern (v.a. Moving Heads).
- Fertige Treiber: Node `dmx` (`enttec-open-usb-dmx`). Timing nicht selbst neu erfinden.
- Linux: Gerätezugriff via `dialout`-Gruppe / udev-Regel.

Wird zuerst abgesichert (Phase 0).

---

## 🎯 Was die App können soll (deine Anforderungen)

1. **Patch / Adressierung** wie Daslight: Adressen + Universe einstellen, **Vorschlag für nächste
   freie Adresse**, Überlappungs-Warnung. **Generic-Lichter + alle Marken** (Fixture-Bibliothek).
2. **Eigene Lichter (Custom Fixtures)** anlegen, falls ein Modell fehlt.
3. **Volle 512 Kanäle** pro Universe (mehrere Universes vorbereitet).
4. **Szenen** in **Bänken** organisieren ("Szene 1"-Bank mit mehreren Szenen drin).
5. **Animationen**: Szenen mit Übergängen (sofort / fade) und Warte-/Haltezeiten in eine
   Sequenz ziehen, speichern, und **per 1 Klick** auslösen — genau wie eine Szene aus der Bank.
6. **Live ohne Szenen**: einfach eine Farbe/Funktion direkt wählen und ausgeben.
7. **Eigenes Board bauen**: Fader & Knöpfe frei hinzufügen und mit Aktionen **verknüpfen**.
8. **Shows mit Cues**: Cue-Liste/Timeline aus Szenen & Animationen, Go-Buttons.
9. **Quick-Buttons**: **Fog**, **Blackout**, **Strobe**, Master-Dimmer — immer griffbereit.

---

## 🧱 Architektur

```
React UI (Dark Mode)
  Live-Pult · Patch · Bänke(Szenen/Animationen) · Board-Editor · Show/Cues · Fixture-Editor
        │ IPC
Core (Node, Electron-main)
  • Fixture-Bibliothek (OFL/GDTF + Custom)
  • Patch-Manager (Universe, Adresse, Position, Auto-Vorschlag)
  • Szenen-Engine (statische Looks)
  • Animations-Engine (Step-Sequencer mit Fade/Hold)
  • Show/Cue-Engine (Go-Liste / Timeline)
  • Board-Engine (Widget→Aktion-Bindings)
  • Effekt-Layer (Strobe, Fog-Burst)
  • Master: Dimmer · Blackout
        │ Output-Mixer → 512-Kanal-Buffer pro Universe, 40 Hz
DMX-Output-Thread → FTDI → DSD TECH → Lampen
```

### Output-Mixer (Schichten, von unten nach oben)
1. **Basis**: aktive Szene / Animation / Show-Cue
2. **Live-Overrides**: manuell gewählte Farben/Funktionen, Board-Fader
3. **Effekt-Layer**: Strobe-Overlay, Fog-Burst
4. **Master-Dimmer** (Multiplikator auf alle Intensity-Kanäle)
5. **Blackout** (oberster Override → alles 0)

Pro Kanal Priorität: **HTP** für Intensität, **LTP** für Position/Farbe. Ein einziger Loop
sendet den fertig gemischten 512-Byte-Buffer mit 40 Hz an den Adapter.

---

## 📐 Datenmodell (Kern)

```
Project
├── Universes[]            (je 512 Kanäle)
├── Patch
│   └── Fixture[]          profil + universe + startAdresse + name + gruppe + position(x,y,rot)
├── Bank[]                 z.B. "Szene 1"
│   ├── Scene[]            statischer Look
│   └── Animation[]        Sequenz aus Scene-Refs
├── Board[]                eigenes Pult
├── Show[]                 Cue-Liste / Timeline
└── Live                   aktuelle manuelle Overrides
```

**Scene (Look):** Snapshot von Funktionswerten je Fixture (`dimmer, r,g,b,w, pan, tilt,
speed, shutter/strobe, gobo, color, focus, fog`) + Fade-In-Zeit. Kann auch nur Teil-Fixtures
betreffen (Rest bleibt unangetastet).

**Animation:** geordnete **Steps**, jeder Step =
`{ sceneRef, transition: "sofort" | "fade", fadeTime, holdTime }` + Loop/Repeat-Optionen.
→ Genau dein Workflow: Szenen mit Abständen/„warten/sofort" reinziehen → als Animation speichern
→ per 1 Klick abspielbar wie eine Szene.

**Board (eigenes Pult):** frei platzierbare **Widgets**:
`Fader | Button | Toggle | Color-Picker | XY-Pad`, jedes mit einem **Binding** (siehe unten).
Raster-Layout, beliebig viele Boards/Seiten.

**Binding-Ziele** (für Board-Widgets *und* Quick-Buttons):
- Master-Dimmer
- Szene auslösen / Animation auslösen (mit/ohne Flash-Modus)
- Fixture- oder Gruppen-Funktion (Dimmer, RGB-Farbe, Pan, Tilt, Speed, Gobo, Strobe …)
- **Fog** (Burst mit Dauer / Auto-Off)
- **Blackout** (Toggle)
- **Strobe** (globales Flash)
- Farbe auf aktuelle Auswahl anwenden

**Show / Cue:** geordnete **Cues**, jeder Cue triggert Szene/Animation/Board-Zustand mit
`Go` (manuell), `Auto-Follow` (nach Zeit), oder optional Timecode. Cross-Fade zwischen Cues.

**Custom Fixture (Editor):** eigenes Profil bauen — Modi, Kanal-Liste, Funktions-Mapping
(`dimmer/rgb/pan/tilt/...`), Fine-Kanäle, Wertebereiche (Gobo-Slots, Color-Wheel-Slots,
Strobe-Range). Export/Import als JSON.

---

## 🗂 Patch / Adressierung (wie Daslight)

- Fixture aus Bibliothek (Generic + alle Marken via **Open Fixture Library**) oder Custom wählen.
- **Universe + Start-Adresse** setzen; App **schlägt die nächste freie Adresse vor** passend zur
  Kanalanzahl des Modus.
- **Überlappungs-/Konflikt-Warnung**, Übersicht der belegten 512 Kanäle.
- Mehrfach-Patch (z.B. 8× gleiche PAR hintereinander) in einem Schritt.

---

## 🎛 Live-Pult & Quick-Buttons

- **Master-Dimmer** (großer Fader)
- **BLACKOUT** (großer roter Toggle)
- **FOG** (eigener Button → DMX-Kanal der Nebelmaschine, Burst/Haltedauer, Auto-Off-Timer)
- **STROBE** (Geschwindigkeit + An/Aus, als Overlay über alles)
- **Farb-Picker / Color-Wheel / Presets** — auch **ohne Szene** direkt auf Auswahl/Gruppe
- **Moving-Head-Speed**-Fader
- Direkter Fixture-/Kanal-Zugriff für schnelles Antesten

---

## 🤖 (Später) Automatische Shows aus Lampen-Position

2D-Bühnenlayout mit Positionen (x,y) → positionsbasierte Effekte (Sweep, Welle, Spiegel,
Kreis/Fächer für Moving Heads, Farb-Gradient), BPM-Sync via Audio/Tap-Tempo, Energy-Slider.
Kommt nach dem manuellen Kern.

---

## 🗺 Roadmap (Phasen, MVP zuerst)

**Phase 0 – Adapter-Spike (kritisch, zuerst):**
Skript, das EINE LED-PAR über den DSD-TECH sauber an-/ausschaltet. Timing + Linux-Rechte sichern.

**Phase 1 – Patch & Live-Control:**
App-Gerüst (Electron+React, Dark Theme), Adapter verbinden, **Patch mit Adress-Vorschlag**,
Kanal-/Fixture-Fader, Farb-Picker (live ohne Szene), Master-Dimmer, **Blackout**.

**Phase 2 – Fixture-Bibliothek + Custom-Fixtures:**
OFL importieren (Generic + Marken), Browser mit Suche, **Custom-Fixture-Editor**, Gruppen.

**Phase 3 – Bänke, Szenen & Animationen:**
Szenen speichern/abrufen, **Bänke** organisieren, **Animations-Sequencer** (Steps mit
sofort/fade + warten), 1-Klick-Auslösung. Output-Mixer mit Layering.

**Phase 4 – Eigenes Board:**
Board-Editor (Fader/Buttons/Color/XY frei platzieren), **Bindings** auf alle Aktionen,
**Fog-** & **Strobe-Button**, mehrere Board-Seiten. (Optional: MIDI-Mapping.)

**Phase 5 – Shows & Cues:**
Cue-Liste/Timeline aus Szenen & Animationen, Go/Auto-Follow, Cross-Fades.

**Phase 6 – Auto-Shows & Politur:**
2D-Bühne + positionsbasierte Auto-Shows, BPM/Tap-Tempo, GDTF-Import, Keyboard-Shortcuts.

---

## 📁 Projektstruktur (Vorschlag)

```
/home/vincent/DMXControl/
  electron/        main-Prozess, DMX-Engine, Mixer
  src/             React-UI (Patch · Bänke · Board · Show · Editor)
  fixtures/        OFL-Daten + Custom-Profile
  data/            SQLite (Projekt, Patch, Szenen, Animationen, Boards, Shows)
```

UI komplett deutsch.

---

## ⚡ Hauptrisiken

1. **Timing/Flackern** (FTDI-Direkt) → Phase 0 zuerst, latency-timer 1 ms.
2. **Linux-Permissions** (FTDI-Zugriff) → beim Spike klären.
3. **Output-Mixer-Komplexität** (Layering von Szene + Live + Effekt + Master + Blackout) →
   sauber als Prioritäts-Pipeline bauen, früh testen.
4. **Moving Heads**: Pan/Tilt-Fine + Kalibrierung → Phase 3/4.

---

## ▶️ Nächster Schritt

**Phase 0 (Adapter-Spike)** — beweisen, dass der DSD-TECH-Adapter eine Lampe sauber ansteuert,
bevor die App gebaut wird.
