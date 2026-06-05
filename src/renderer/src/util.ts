import { FixtureProfile, PatchedFixture, FunctionType } from '../../shared/types'
import { BUILTIN_PROFILES } from '../../shared/fixtures'

export const uid = (prefix = 'id') =>
  `${prefix}-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))}`

export function allProfiles(custom: FixtureProfile[]): FixtureProfile[] {
  return [...BUILTIN_PROFILES, ...custom]
}

export function findProfile(custom: FixtureProfile[], id: string): FixtureProfile | undefined {
  return BUILTIN_PROFILES.find(p => p.id === id) || custom.find(p => p.id === id)
}

export function channelCount(profile: FixtureProfile, modeIndex: number): number {
  return profile.modes[modeIndex]?.channels.length ?? 0
}

// Belegte Kanaele eines Universe (Set von 1-basierten Adressen)
export function occupiedChannels(
  fixtures: PatchedFixture[], custom: FixtureProfile[], universe: number, ignoreId?: string
): Set<number> {
  const set = new Set<number>()
  for (const fx of fixtures) {
    if (fx.universe !== universe || fx.id === ignoreId) continue
    const prof = findProfile(custom, fx.profileId)
    if (!prof) continue
    const n = channelCount(prof, fx.modeIndex)
    for (let i = 0; i < n; i++) set.add(fx.address + i)
  }
  return set
}

// Naechste freie Startadresse fuer ein Fixture mit n Kanaelen vorschlagen
export function suggestAddress(
  fixtures: PatchedFixture[], custom: FixtureProfile[], universe: number, n: number, ignoreId?: string
): number {
  const occ = occupiedChannels(fixtures, custom, universe, ignoreId)
  for (let start = 1; start + n - 1 <= 512; start++) {
    let free = true
    for (let i = 0; i < n; i++) if (occ.has(start + i)) { free = false; break }
    if (free) return start
  }
  return 1
}

export function hasOverlap(
  fixtures: PatchedFixture[], custom: FixtureProfile[], universe: number, address: number, n: number, ignoreId?: string
): boolean {
  const occ = occupiedChannels(fixtures, custom, universe, ignoreId)
  for (let i = 0; i < n; i++) if (occ.has(address + i)) return true
  return false
}

export const FUNC_LABELS: Record<FunctionType, string> = {
  dimmer: 'Dimmer', red: 'Rot', green: 'Gruen', blue: 'Blau', white: 'Weiss', amber: 'Amber', uv: 'UV',
  pan: 'Pan', panFine: 'Pan Fine', tilt: 'Tilt', tiltFine: 'Tilt Fine', speed: 'Speed',
  shutter: 'Shutter', strobe: 'Strobe', gobo: 'Gobo', color: 'Farbrad', focus: 'Focus',
  fog: 'Fog', macro: 'Makro', unused: 'Frei'
}

export const ALL_FUNCS: FunctionType[] = [
  'dimmer', 'red', 'green', 'blue', 'white', 'amber', 'uv',
  'pan', 'panFine', 'tilt', 'tiltFine', 'speed',
  'shutter', 'strobe', 'gobo', 'color', 'focus', 'fog', 'macro', 'unused'
]

// Live-Farbe einer Lampe aus dem aktuellen DMX-Frame (pro Universe).
export function fixtureColor(
  fx: PatchedFixture, custom: FixtureProfile[], frame: Record<number, number[]>
): string {
  const prof = findProfile(custom, fx.profileId)
  const mode = prof?.modes[fx.modeIndex]
  const uframe = frame[fx.universe]
  if (!mode || !uframe) return '#2a2f3d'
  const idxOf = (fn: FunctionType) => mode.channels.findIndex(c => c.function === fn)
  const get = (fn: FunctionType) => { const i = idxOf(fn); return i >= 0 ? (uframe[fx.address - 1 + i] ?? 0) : 0 }
  const hasRGB = idxOf('red') >= 0 && idxOf('green') >= 0 && idxOf('blue') >= 0
  let r: number, g: number, b: number
  if (hasRGB) { r = get('red'); g = get('green'); b = get('blue') }
  else { const d = get('dimmer'); r = g = b = d }
  if (idxOf('dimmer') >= 0 && hasRGB) { const d = get('dimmer') / 255; r *= d; g *= d; b *= d }
  if (r + g + b < 6) return '#2a2f3d'
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`
}

export function hex2rgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '')
  return {
    r: parseInt(m.slice(0, 2), 16) || 0,
    g: parseInt(m.slice(2, 4), 16) || 0,
    b: parseInt(m.slice(4, 6), 16) || 0
  }
}
