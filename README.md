# VG | DMX Software

Eigene DMX-Lichtsteuerung (Daslight-Style) für den **DSD TECH USB→DMX**-Adapter.
Electron + React + TypeScript, Dark Mode, komplett deutsch.

## Installieren / Download

Fertige Pakete liegen nach dem Build in `dist/`:

- **`VG DMX Software-1.0.0.AppImage`** — portabel, kein Installer nötig:
  ```bash
  chmod +x "VG DMX Software-1.0.0.AppImage"
  ./"VG DMX Software-1.0.0.AppImage"
  ```
- **`vg-dmx-software_1.0.0_amd64.deb`** — für Debian/Ubuntu/Mint:
  ```bash
  sudo apt install ./vg-dmx-software_1.0.0_amd64.deb
  ```

Selbst neu bauen:
```bash
npm install
npm run dist:linux   # AppImage + .deb nach dist/
npm run dist:win     # Windows-Installer (auf Windows ausfuehren)
```

## Aus dem Quellcode starten (Entwicklung)

```bash
npm install
npm run dev      # Hot-Reload
```

## Bedienung

Beim Start öffnet sich die **Event-Übersicht**: Events (Projekte) anlegen, öffnen,
umbenennen, duplizieren, löschen. Jedes Event hat seine **eigenen** Lampen, Szenen,
Animationen, sein Board und seine Einstellungen.

Oben in der Leiste: Event-Wechsler, Master-Dimmer, **FOG**, **STROBE**, **BLACKOUT**,
Verbindungsstatus. Links die Navigation.

### Funktionen
- **Live-Pult** — Fixtures/Gruppen wählen, Farbe/Dimmer/Pan/Tilt/Speed direkt steuern, Look als Szene aufnehmen
- **Kanäle (DMX)** — jeden einzelnen DMX-Kanal jeder Lampe von Hand steuern (wie der Daslight-DMX-View)
- **2D-Bühne** — Lampen per Drag&Drop platzieren/verschieben, Live-Farbe sichtbar
- **Auto-Show** — automatische Shows aus Position, Typ & Symmetrie (Welle, Sweep, Lauflicht, Regenbogen, Symmetrie, Moving-Head-Kreise, Puls, Strobe) mit BPM/Tap-Tempo, Energie & Farbpalette
- **Bänke & Szenen** — statische Looks organisieren, per Klick auslösen (HTP-Mix)
- **Animationen** — Szenen mit *sofort/fade* + Wartezeiten verketten, Loop, 1-Klick-Play
- **Mein Board** — Buttons & Fader **frei platzieren** (ziehen) und mit Szene/Animation/Master/Fog/Blackout/Strobe verknüpfen
- **Patch** — Fixture-Bibliothek, automatischer Adress-Vorschlag, Konflikt-Warnung (512 Kanäle, mehrere Universes)
- **Fixture-Bibliothek** — viele Generics + Marken; eigener **Custom-Fixture-Editor**

### Kopieren & Einfügen zwischen Events
Fixtures im Live-Pult oder auf der Bühne auswählen → **Strg+C**. In ein anderes Event
wechseln → **Strg+V**. (Funktioniert über die System-Zwischenablage auch nach Neustart.)

## Hardware

Der DSD TECH ist ein FTDI-basierter **„Open DMX USB"**-Adapter (kein Timing-Chip).
Das DMX-Signal wird in Software erzeugt: Break + 512 Kanäle @ 250 kBaud / 8N2, ~40 Hz.

- **Ohne Adapter** läuft alles im **Simulationsmodus** — Werte im DMX-Monitor (Live-Pult) sichtbar.
- **Mit Adapter**: unter *Einstellungen* den seriellen Port wählen und verbinden.
- **Linux-Rechte**: erscheint der Port nicht → `sudo usermod -aG dialout $USER` (danach neu einloggen).
- Bei Flackern den FTDI „latency timer" auf 1 ms stellen.

## Speicherung

Alle Events liegen in `userData/workspace.json` (automatisches Speichern).

## Roadmap

Shows/Cue-Listen mit Go & Auto-Follow · OFL/GDTF-Import (verifizierte Marken-Daten) · MIDI-Mapping.
Siehe `PLAN.md`.
