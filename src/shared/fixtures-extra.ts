// Kuratierte / gezielt angefragte Fixtures (vor den auto-generierten Marken-Profilen,
// damit sie bei Namens-/ID-Kollision gewinnen). Kanalbelegungen aus Hersteller-Manuals.

import type { FixtureProfile, ChannelDef } from './types'

const ch = (f: ChannelDef['function'], name: string): ChannelDef => ({ function: f, name })

// 5x RGBW Pixel-Zellen (fuer Penta Pix Pixel-Modi)
const cells = (n: number): ChannelDef[] => {
  const out: ChannelDef[] = []
  for (let i = 1; i <= n; i++) {
    out.push(ch('red', `Zelle ${i} Rot`), ch('green', `Zelle ${i} Gruen`), ch('blue', `Zelle ${i} Blau`), ch('white', `Zelle ${i} Weiss`))
  }
  return out
}

export const EXTRA_PROFILES: FixtureProfile[] = [
  // ---- ADJ Penta Pix (5 Modi: 4/8/11/20/27) – 11ch ist die empfohlene Vollfarb-Belegung (Manual verifiziert) ----
  {
    id: 'adj-penta-pix', brand: 'ADJ', name: 'Penta Pix', builtin: true,
    modes: [
      { name: '11-Kanal (empfohlen)', channels: [
        ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('white', 'Weiss'),
        ch('macro', 'Farb-Makro'), ch('macro', 'Programm'), ch('macro', 'Modus'),
        ch('speed', 'Programm-Speed'), ch('macro', 'Effekt'), ch('strobe', 'Strobe'),
        ch('dimmer', 'Master-Dimmer')
      ] },
      { name: '4-Kanal', channels: [ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('dimmer', 'Dimmer')] },
      { name: '8-Kanal', channels: [
        ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('white', 'Weiss'),
        ch('macro', 'Farb-Makro'), ch('strobe', 'Strobe'), ch('speed', 'Speed'), ch('dimmer', 'Dimmer')
      ] },
      { name: '20-Kanal (Pixel 5x RGBW)', channels: cells(5) },
      { name: '27-Kanal (Pixel + Steuerung)', channels: [
        ...cells(5),
        ch('dimmer', 'Master-Dimmer'), ch('strobe', 'Strobe'), ch('macro', 'Farb-Makro'),
        ch('macro', 'Programm'), ch('speed', 'Speed'), ch('macro', 'Effekt'), ch('macro', 'Funktion')
      ] }
    ]
  },

  // ---- MAX (Tronios) PartyBar12 – Derby + PAR-Wash + Strobe (Modi 3/6/15 lt. Manual) ----
  {
    id: 'max-partybar12', brand: 'MAX', name: 'PartyBar12', builtin: true,
    modes: [
      { name: '15-Kanal', channels: [
        ch('macro', 'Derby 1 Farbe'), ch('red', 'Derby 1 Rot'), ch('green', 'Derby 1 Gruen'), ch('blue', 'Derby 1 Blau'), ch('speed', 'Derby 1 Rotation'),
        ch('dimmer', 'PAR 1&2 Dimmer'), ch('red', 'PAR Rot'), ch('green', 'PAR Gruen'), ch('blue', 'PAR Blau'),
        ch('macro', 'Derby 2 Farbe'), ch('red', 'Derby 2 Rot'), ch('green', 'Derby 2 Gruen'), ch('blue', 'Derby 2 Blau'), ch('speed', 'Derby 2 Rotation'),
        ch('strobe', 'Strobe')
      ] },
      { name: '6-Kanal', channels: [
        ch('macro', 'Farbe'), ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('strobe', 'Strobe'), ch('speed', 'Speed')
      ] },
      { name: '3-Kanal', channels: [ch('macro', 'Farbe'), ch('macro', 'Auto-Modus'), ch('speed', 'Speed')] }
    ]
  },

  // ---- ZonQoonz Wallwasher 48x RGB 3-in-1 (Amazon ASIN B0CYGXHVR2, Modell ZQ06074EU) ----
  {
    id: 'zonqoonz-wallwasher-48-rgb', brand: 'ZonQoonz', name: 'Wallwasher 48 RGB 3-in-1 (ZQ06074EU)', builtin: true,
    modes: [
      { name: '7-Kanal', channels: [
        ch('dimmer', 'Master-Dimmer'), ch('strobe', 'Strobe'), ch('macro', 'Farb-Makro'), ch('speed', 'Speed'),
        ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau')
      ] },
      { name: '3-Kanal', channels: [ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau')] }
    ]
  }
]
