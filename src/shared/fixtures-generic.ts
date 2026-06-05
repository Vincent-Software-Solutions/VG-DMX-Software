// Umfangreiche generische Fixture-Profile (praezise selbst gepflegt).
// Deckt die gaengigsten Bauformen ab – fuer Markengeraete siehe fixtures-brands.ts.

import type { FixtureProfile, ChannelDef } from './types'

const ch = (f: ChannelDef['function'], name: string): ChannelDef => ({ function: f, name })

export const GENERIC_PROFILES: FixtureProfile[] = [
  // ---- Dimmer / einfache Kanaele ----
  { id: 'g-switch-1', brand: 'Generic', name: 'Schalter / Relais (1 Kanal)', builtin: true,
    modes: [{ name: '1ch', channels: [ch('dimmer', 'An/Aus')] }] },
  { id: 'g-dimmer-1', brand: 'Generic', name: 'Dimmer (1 Kanal)', builtin: true,
    modes: [{ name: '1ch', channels: [ch('dimmer', 'Dimmer')] }] },
  { id: 'g-dimmer-2', brand: 'Generic', name: 'Dimmer + Strobe (2 Kanal)', builtin: true,
    modes: [{ name: '2ch', channels: [ch('dimmer', 'Dimmer'), ch('strobe', 'Strobe')] }] },

  // ---- LED Farbmischer (ohne Dimmer) ----
  { id: 'g-rgb-3', brand: 'Generic', name: 'RGB (3 Kanal)', builtin: true,
    modes: [{ name: '3ch', channels: [ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau')] }] },
  { id: 'g-rgba-4', brand: 'Generic', name: 'RGBA (4 Kanal)', builtin: true,
    modes: [{ name: '4ch', channels: [ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('amber', 'Amber')] }] },
  { id: 'g-rgbw-4', brand: 'Generic', name: 'RGBW (4 Kanal)', builtin: true,
    modes: [{ name: '4ch', channels: [ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('white', 'Weiss')] }] },
  { id: 'g-rgbwa-5', brand: 'Generic', name: 'RGBWA (5 Kanal)', builtin: true,
    modes: [{ name: '5ch', channels: [ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('white', 'Weiss'), ch('amber', 'Amber')] }] },
  { id: 'g-rgbwauv-6', brand: 'Generic', name: 'RGBWA+UV (6 Kanal)', builtin: true,
    modes: [{ name: '6ch', channels: [ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('white', 'Weiss'), ch('amber', 'Amber'), ch('uv', 'UV')] }] },

  // ---- LED PAR mit Master-Dimmer ----
  { id: 'g-par-rgb-d-4', brand: 'Generic', name: 'LED PAR RGB + Dimmer (4 Kanal)', builtin: true,
    modes: [{ name: '4ch', channels: [ch('dimmer', 'Dimmer'), ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau')] }] },
  { id: 'g-par-rgb-6', brand: 'Generic', name: 'LED PAR RGB (Dimmer/Strobe, 6 Kanal)', builtin: true,
    modes: [{ name: '6ch', channels: [ch('dimmer', 'Dimmer'), ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('strobe', 'Strobe'), ch('macro', 'Makro')] }] },
  { id: 'g-par-rgbw-6', brand: 'Generic', name: 'LED PAR RGBW + Dimmer (6 Kanal)', builtin: true,
    modes: [{ name: '6ch', channels: [ch('dimmer', 'Dimmer'), ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('white', 'Weiss'), ch('strobe', 'Strobe')] }] },
  { id: 'g-par-rgbwauv-d-8', brand: 'Generic', name: 'LED PAR RGBWA+UV + Dimmer (8 Kanal)', builtin: true,
    modes: [{ name: '8ch', channels: [ch('dimmer', 'Dimmer'), ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('white', 'Weiss'), ch('amber', 'Amber'), ch('uv', 'UV'), ch('strobe', 'Strobe')] }] },
  { id: 'g-par-rgbwauv-10', brand: 'Generic', name: 'LED PAR RGBWA+UV (Dimmer/Strobe/Makro, 10 Kanal)', builtin: true,
    modes: [{ name: '10ch', channels: [ch('dimmer', 'Dimmer'), ch('strobe', 'Strobe'), ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('white', 'Weiss'), ch('amber', 'Amber'), ch('uv', 'UV'), ch('macro', 'Farb-Makro'), ch('speed', 'Speed')] }] },

  // ---- Wash / Fluter ----
  { id: 'g-wash-rgbw-7', brand: 'Generic', name: 'LED Wash RGBW (7 Kanal)', builtin: true,
    modes: [{ name: '7ch', channels: [ch('dimmer', 'Dimmer'), ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('white', 'Weiss'), ch('strobe', 'Strobe'), ch('macro', 'Makro')] }] },

  // ---- LED Bar / Pixel ----
  { id: 'g-bar-rgb-3', brand: 'Generic', name: 'LED Bar RGB (3 Kanal)', builtin: true,
    modes: [{ name: '3ch', channels: [ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau')] }] },
  { id: 'g-bar-rgb-7', brand: 'Generic', name: 'LED Bar RGB (Dimmer/Strobe, 7 Kanal)', builtin: true,
    modes: [{ name: '7ch', channels: [ch('dimmer', 'Dimmer'), ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('strobe', 'Strobe'), ch('macro', 'Makro'), ch('speed', 'Speed')] }] },

  // ---- UV / Strobe / Blinder ----
  { id: 'g-uv-1', brand: 'Generic', name: 'UV Fluter (1 Kanal)', builtin: true,
    modes: [{ name: '1ch', channels: [ch('uv', 'UV')] }] },
  { id: 'g-strobe-1', brand: 'Generic', name: 'Strobe (1 Kanal)', builtin: true,
    modes: [{ name: '1ch', channels: [ch('strobe', 'Rate')] }] },
  { id: 'g-strobe-2', brand: 'Generic', name: 'Strobe (Dimmer/Rate, 2 Kanal)', builtin: true,
    modes: [{ name: '2ch', channels: [ch('dimmer', 'Intensitaet'), ch('strobe', 'Rate')] }] },
  { id: 'g-blinder-2', brand: 'Generic', name: 'Blinder 2-fach (2 Kanal)', builtin: true,
    modes: [{ name: '2ch', channels: [ch('dimmer', 'Block 1'), ch('dimmer', 'Block 2')] }] },

  // ---- Nebel / Haze ----
  { id: 'g-fog-1', brand: 'Generic', name: 'Nebelmaschine (1 Kanal)', builtin: true,
    modes: [{ name: '1ch', channels: [ch('fog', 'Fog')] }] },
  { id: 'g-fog-2', brand: 'Generic', name: 'Nebel + Luefter (2 Kanal)', builtin: true,
    modes: [{ name: '2ch', channels: [ch('fog', 'Fog'), ch('speed', 'Luefter')] }] },
  { id: 'g-fog-rgb-5', brand: 'Generic', name: 'Nebel mit LED RGB (5 Kanal)', builtin: true,
    modes: [{ name: '5ch', channels: [ch('fog', 'Fog'), ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('macro', 'Makro')] }] },
  { id: 'g-haze-2', brand: 'Generic', name: 'Hazer (2 Kanal)', builtin: true,
    modes: [{ name: '2ch', channels: [ch('fog', 'Haze'), ch('speed', 'Luefter')] }] },

  // ---- Moving Heads ----
  { id: 'g-mh-wash-rgbw-12', brand: 'Generic', name: 'Moving Head Wash RGBW (12 Kanal)', builtin: true,
    modes: [{ name: '12ch', channels: [
      ch('pan', 'Pan'), ch('panFine', 'Pan Fine'), ch('tilt', 'Tilt'), ch('tiltFine', 'Tilt Fine'),
      ch('speed', 'Speed'), ch('dimmer', 'Dimmer'), ch('shutter', 'Shutter/Strobe'),
      ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('white', 'Weiss'), ch('macro', 'Makro')] }] },
  { id: 'g-mh-spot-14', brand: 'Generic', name: 'Moving Head Spot (14 Kanal)', builtin: true,
    modes: [{ name: '14ch', channels: [
      ch('pan', 'Pan'), ch('panFine', 'Pan Fine'), ch('tilt', 'Tilt'), ch('tiltFine', 'Tilt Fine'),
      ch('speed', 'Speed'), ch('dimmer', 'Dimmer'), ch('shutter', 'Shutter/Strobe'),
      ch('color', 'Farbrad'), ch('gobo', 'Gobo'), ch('red', 'Rot'), ch('green', 'Gruen'),
      ch('blue', 'Blau'), ch('white', 'Weiss'), ch('focus', 'Focus')] }] },
  { id: 'g-mh-beam-16', brand: 'Generic', name: 'Moving Head Beam (16 Kanal)', builtin: true,
    modes: [{ name: '16ch', channels: [
      ch('pan', 'Pan'), ch('panFine', 'Pan Fine'), ch('tilt', 'Tilt'), ch('tiltFine', 'Tilt Fine'),
      ch('speed', 'Speed'), ch('dimmer', 'Dimmer'), ch('shutter', 'Shutter/Strobe'),
      ch('color', 'Farbrad'), ch('gobo', 'Gobo'), ch('macro', 'Prisma'), ch('focus', 'Focus'),
      ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'), ch('white', 'Weiss'), ch('macro', 'Funktion')] }] },
  { id: 'g-mh-mini-11', brand: 'Generic', name: 'Mini Moving Head RGBW (11 Kanal)', builtin: true,
    modes: [{ name: '11ch', channels: [
      ch('pan', 'Pan'), ch('tilt', 'Tilt'), ch('speed', 'Speed'), ch('dimmer', 'Dimmer'),
      ch('shutter', 'Shutter/Strobe'), ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'),
      ch('white', 'Weiss'), ch('macro', 'Makro'), ch('macro', 'Auto')] }] },

  // ---- Scanner ----
  { id: 'g-scanner-7', brand: 'Generic', name: 'Scanner (7 Kanal)', builtin: true,
    modes: [{ name: '7ch', channels: [
      ch('pan', 'Pan'), ch('tilt', 'Tilt'), ch('color', 'Farbrad'), ch('gobo', 'Gobo'),
      ch('shutter', 'Shutter'), ch('dimmer', 'Dimmer'), ch('speed', 'Speed')] }] },

  // ---- Laser ----
  { id: 'g-laser-rg-8', brand: 'Generic', name: 'Laser RG (8 Kanal)', builtin: true,
    modes: [{ name: '8ch', channels: [
      ch('macro', 'Modus'), ch('macro', 'Muster'), ch('macro', 'Rotation'), ch('pan', 'X'),
      ch('tilt', 'Y'), ch('speed', 'Scan-Speed'), ch('color', 'Farbe'), ch('strobe', 'Strobe')] }] },

  // ---- Derby / Effekt ----
  { id: 'g-derby-rgbw-6', brand: 'Generic', name: 'LED Derby RGBW (6 Kanal)', builtin: true,
    modes: [{ name: '6ch', channels: [
      ch('dimmer', 'Dimmer'), ch('red', 'Rot'), ch('green', 'Gruen'), ch('blue', 'Blau'),
      ch('white', 'Weiss'), ch('speed', 'Rotation')] }] }
]
