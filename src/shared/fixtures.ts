// Eingebaute Fixture-Bibliothek (Generic + ein paar Marken-Beispiele).
// Erweiterbar via Custom-Fixture-Editor in der App; OFL-Import folgt in Phase 2.

import type { FixtureProfile } from './types'
import { GENERIC_PROFILES } from './fixtures-generic'
import { EXTRA_PROFILES } from './fixtures-extra'
import { BRAND_PROFILES } from './fixtures-brands'

const CORE_PROFILES: FixtureProfile[] = [
  {
    id: 'generic-dimmer-1',
    brand: 'Generic',
    name: 'Dimmer (1 Kanal)',
    builtin: true,
    modes: [{ name: '1ch', channels: [{ function: 'dimmer', name: 'Dimmer' }] }]
  },
  {
    id: 'generic-rgb-3',
    brand: 'Generic',
    name: 'RGB (3 Kanal)',
    builtin: true,
    modes: [{
      name: '3ch',
      channels: [
        { function: 'red', name: 'Rot' },
        { function: 'green', name: 'Gruen' },
        { function: 'blue', name: 'Blau' }
      ]
    }]
  },
  {
    id: 'generic-rgbw-4',
    brand: 'Generic',
    name: 'RGBW (4 Kanal)',
    builtin: true,
    modes: [{
      name: '4ch',
      channels: [
        { function: 'red', name: 'Rot' },
        { function: 'green', name: 'Gruen' },
        { function: 'blue', name: 'Blau' },
        { function: 'white', name: 'Weiss' }
      ]
    }]
  },
  {
    id: 'generic-par-rgb-7',
    brand: 'Generic',
    name: 'LED PAR RGB (Dimmer/Strobe, 7 Kanal)',
    builtin: true,
    modes: [{
      name: '7ch',
      channels: [
        { function: 'dimmer', name: 'Master-Dimmer' },
        { function: 'red', name: 'Rot' },
        { function: 'green', name: 'Gruen' },
        { function: 'blue', name: 'Blau' },
        { function: 'strobe', name: 'Strobe' },
        { function: 'macro', name: 'Farb-Makro' },
        { function: 'speed', name: 'Programm-Speed' }
      ]
    }]
  },
  {
    id: 'generic-par-rgbw-8',
    brand: 'Generic',
    name: 'LED PAR RGBW (Dimmer/Strobe, 8 Kanal)',
    builtin: true,
    modes: [{
      name: '8ch',
      channels: [
        { function: 'dimmer', name: 'Master-Dimmer' },
        { function: 'red', name: 'Rot' },
        { function: 'green', name: 'Gruen' },
        { function: 'blue', name: 'Blau' },
        { function: 'white', name: 'Weiss' },
        { function: 'amber', name: 'Amber' },
        { function: 'uv', name: 'UV' },
        { function: 'strobe', name: 'Strobe' }
      ]
    }]
  },
  {
    id: 'generic-movinghead-14',
    brand: 'Generic',
    name: 'Moving Head Spot (14 Kanal)',
    builtin: true,
    modes: [{
      name: '14ch',
      channels: [
        { function: 'pan', name: 'Pan' },
        { function: 'panFine', name: 'Pan Fine' },
        { function: 'tilt', name: 'Tilt' },
        { function: 'tiltFine', name: 'Tilt Fine' },
        { function: 'speed', name: 'Pan/Tilt Speed' },
        { function: 'dimmer', name: 'Dimmer' },
        { function: 'shutter', name: 'Shutter/Strobe' },
        { function: 'color', name: 'Farbrad' },
        { function: 'gobo', name: 'Gobo' },
        { function: 'red', name: 'Rot' },
        { function: 'green', name: 'Gruen' },
        { function: 'blue', name: 'Blau' },
        { function: 'white', name: 'Weiss' },
        { function: 'focus', name: 'Focus' }
      ]
    }]
  },
  {
    id: 'generic-movinghead-rgbw-wash-12',
    brand: 'Generic',
    name: 'Moving Head Wash RGBW (12 Kanal)',
    builtin: true,
    modes: [{
      name: '12ch',
      channels: [
        { function: 'pan', name: 'Pan' },
        { function: 'panFine', name: 'Pan Fine' },
        { function: 'tilt', name: 'Tilt' },
        { function: 'tiltFine', name: 'Tilt Fine' },
        { function: 'speed', name: 'Speed' },
        { function: 'dimmer', name: 'Dimmer' },
        { function: 'shutter', name: 'Shutter/Strobe' },
        { function: 'red', name: 'Rot' },
        { function: 'green', name: 'Gruen' },
        { function: 'blue', name: 'Blau' },
        { function: 'white', name: 'Weiss' },
        { function: 'macro', name: 'Farb-Makro' }
      ]
    }]
  },
  {
    id: 'generic-fog-1',
    brand: 'Generic',
    name: 'Nebelmaschine (1 Kanal)',
    builtin: true,
    modes: [{ name: '1ch', channels: [{ function: 'fog', name: 'Fog' }] }]
  },
  {
    id: 'generic-fog-2',
    brand: 'Generic',
    name: 'Nebelmaschine + Fan (2 Kanal)',
    builtin: true,
    modes: [{
      name: '2ch',
      channels: [
        { function: 'fog', name: 'Fog' },
        { function: 'speed', name: 'Luefter' }
      ]
    }]
  },
  {
    id: 'generic-strobe-2',
    brand: 'Generic',
    name: 'Strobe (Dimmer/Rate, 2 Kanal)',
    builtin: true,
    modes: [{
      name: '2ch',
      channels: [
        { function: 'dimmer', name: 'Intensitaet' },
        { function: 'strobe', name: 'Rate' }
      ]
    }]
  }
]

// Kombinierte eingebaute Bibliothek: Extra (kuratiert) + Kern + Generics + Marken (dedupliziert per id)
export const BUILTIN_PROFILES: FixtureProfile[] = dedupeById([
  ...EXTRA_PROFILES, ...CORE_PROFILES, ...GENERIC_PROFILES, ...BRAND_PROFILES
])

function dedupeById(list: FixtureProfile[]): FixtureProfile[] {
  const seen = new Set<string>()
  const out: FixtureProfile[] = []
  for (const p of list) { if (!seen.has(p.id)) { seen.add(p.id); out.push(p) } }
  return out
}

export function findProfile(profiles: FixtureProfile[], id: string): FixtureProfile | undefined {
  return BUILTIN_PROFILES.find(p => p.id === id) || profiles.find(p => p.id === id)
}

export function allProfiles(custom: FixtureProfile[]): FixtureProfile[] {
  return [...BUILTIN_PROFILES, ...custom]
}

export function brandsOf(profiles: FixtureProfile[]): string[] {
  return Array.from(new Set(profiles.map(p => p.brand))).sort()
}
