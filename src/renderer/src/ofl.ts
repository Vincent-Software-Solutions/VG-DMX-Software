// Importiert Open-Fixture-Library-JSON (Einzel-Fixture) in unser FixtureProfile-Format.
// Best-effort-Mapping der OFL-Capability-Typen auf unsere Funktionen.

import { FixtureProfile, FunctionType, ChannelDef } from '../../shared/types'

function colorToFunc(color: string): FunctionType {
  const c = (color || '').toLowerCase()
  if (c === 'red') return 'red'
  if (c === 'green') return 'green'
  if (c === 'blue') return 'blue'
  if (c === 'white' || c === 'warm white' || c === 'cold white') return 'white'
  if (c === 'amber') return 'amber'
  if (c === 'uv') return 'uv'
  return 'macro'
}

function capToFunc(caps: any[], name: string): FunctionType {
  const lname = (name || '').toLowerCase()
  // Einzel-Capability ColorIntensity -> direkte Farbe
  if (caps.length === 1 && caps[0]?.type === 'ColorIntensity') return colorToFunc(caps[0].color)
  const t = caps[0]?.type || ''
  switch (t) {
    case 'Intensity': return 'dimmer'
    case 'ShutterStrobe': case 'StrobeSpeed': case 'StrobeDuration': return 'strobe'
    case 'Pan': return 'pan'
    case 'Tilt': return 'tilt'
    case 'PanTiltSpeed': return 'speed'
    case 'Speed': case 'EffectSpeed': case 'EffectDuration': return 'speed'
    case 'Focus': case 'Zoom': case 'Iris': return 'focus'
    case 'Fog': case 'FogOutput': case 'FogType': return 'fog'
    case 'ColorPreset': case 'ColorTemperature': return 'color'
    case 'WheelSlot': case 'WheelRotation': case 'WheelShake': case 'WheelSlotRotation':
      if (lname.includes('gobo')) return 'gobo'
      if (lname.includes('color') || lname.includes('colour')) return 'color'
      return 'macro'
    default:
      if (lname.includes('dimmer') || lname.includes('intensity')) return 'dimmer'
      if (lname.includes('pan')) return 'pan'
      if (lname.includes('tilt')) return 'tilt'
      if (lname.includes('gobo')) return 'gobo'
      if (lname.includes('fog') || lname.includes('smoke')) return 'fog'
      return 'macro'
  }
}

function fineOf(fn: FunctionType): FunctionType {
  if (fn === 'pan') return 'panFine'
  if (fn === 'tilt') return 'tiltFine'
  return 'unused'
}

const slug = (s: string) => (s || 'ofl').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export function parseOfl(json: any): FixtureProfile | null {
  if (!json || !Array.isArray(json.modes)) return null
  const ac = json.availableChannels
  if (!ac || typeof ac !== 'object' || Array.isArray(ac)) return null
  const fnByName: Record<string, FunctionType> = {}
  for (const [name, raw] of Object.entries<any>(ac)) {
    const ch = raw || {}
    const caps = ch.capabilities || (ch.capability ? [ch.capability] : [])
    const fn = capToFunc(caps, name)
    fnByName[name] = fn
    for (const alias of ch.fineChannelAliases || []) fnByName[alias] = fineOf(fn)
  }

  const modes = (json.modes as any[]).map((m) => {
    const list = Array.isArray(m?.channels) ? (m.channels as (string | null)[]) : []
    const channels: ChannelDef[] = list.map((cn) => {
      if (!cn) return { function: 'unused' as FunctionType, name: 'Frei' }
      // Matrix-/Template-Kanaele stehen nicht in availableChannels -> Name-Heuristik statt hart 'macro'
      const fn = fnByName[cn] ?? capToFunc([], cn)
      return { function: fn, name: cn }
    })
    return { name: m?.name || `${channels.length}ch`, channels }
  }).filter(m => m.channels.length > 0)

  if (!modes.length) return null
  const brand = json.manufacturerName || json.manufacturer || 'OFL Import'
  const name = json.name || 'Fixture'
  return { id: `ofl-${slug(brand)}-${slug(name)}`, brand, name, modes }
}
