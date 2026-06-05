// Minimaler GDTF-Import (Best-Effort): GDTF ist ein ZIP mit description.xml.
// Wir entpacken description.xml (Node zlib) und lesen DMXModes/DMXChannels per Regex.
// Komplexe GDTF-Features (Fine-Channels, Subchannels) werden vereinfacht.

import { promises as fs } from 'fs'
import { inflateRawSync } from 'zlib'
import { FixtureProfile, FunctionType, ChannelDef } from '../shared/types'

// ZIP: description.xml extrahieren ueber die Central Directory
function extractFile(zip: Buffer, target: string): Buffer | null {
  const EOCD = 0x06054b50
  const Z64 = 0xffffffff
  let eocd = -1
  for (let i = zip.length - 22; i >= 0 && i > zip.length - 22 - 65536; i--) {
    if (zip.readUInt32LE(i) === EOCD) { eocd = i; break }
  }
  if (eocd < 0) return null
  let off = zip.readUInt32LE(eocd + 16)
  const count = zip.readUInt16LE(eocd + 10)
  if (off === Z64) return null // ZIP64 nicht unterstuetzt
  for (let e = 0; e < count; e++) {
    if (off + 46 > zip.length || zip.readUInt32LE(off) !== 0x02014b50) break
    const method = zip.readUInt16LE(off + 10)
    const compSize = zip.readUInt32LE(off + 20)
    const fnLen = zip.readUInt16LE(off + 28)
    const extraLen = zip.readUInt16LE(off + 30)
    const commentLen = zip.readUInt16LE(off + 32)
    const localOff = zip.readUInt32LE(off + 42)
    if (off + 46 + fnLen > zip.length) break
    const name = zip.toString('utf8', off + 46, off + 46 + fnLen)
    if (name.toLowerCase().endsWith(target)) {
      if (localOff === Z64 || compSize === Z64 || localOff + 30 > zip.length) return null
      const lfnLen = zip.readUInt16LE(localOff + 26)
      const lExtra = zip.readUInt16LE(localOff + 28)
      const dataStart = localOff + 30 + lfnLen + lExtra
      if (dataStart + compSize > zip.length) return null
      const data = zip.subarray(dataStart, dataStart + compSize)
      return method === 8 ? inflateRawSync(data) : Buffer.from(data)
    }
    off += 46 + fnLen + extraLen + commentLen
  }
  return null
}

function mapAttribute(attr: string): FunctionType {
  const a = attr.toLowerCase()
  if (a === 'dimmer' || a.startsWith('intensity')) return 'dimmer'
  if (a.includes('red') || a === 'coloradd_r' || a === 'colorrgb_red') return 'red'
  if (a.includes('green') || a === 'coloradd_g' || a === 'colorrgb_green') return 'green'
  if (a.includes('blue') || a === 'coloradd_b' || a === 'colorrgb_blue') return 'blue'
  if (a.includes('white') || a === 'coloradd_w') return 'white'
  if (a.includes('amber') || a === 'coloradd_a') return 'amber'
  if (a === 'coloradd_uv' || a.includes('uv')) return 'uv'
  if (a.startsWith('pan')) return a.includes('rota') ? 'pan' : 'pan'
  if (a.startsWith('tilt')) return 'tilt'
  if (a.startsWith('shutter') || a.includes('strobe')) return 'strobe'
  if (a.startsWith('gobo')) return 'gobo'
  if (a.startsWith('color') && a !== 'coloradd_uv') return 'color'
  if (a.startsWith('focus')) return 'focus'
  if (a.startsWith('zoom')) return 'focus'
  if (a.includes('smoke') || a.includes('fog')) return 'fog'
  if (a.includes('speed') || a.includes('mspeed') || a.includes('ptspeed')) return 'speed'
  return 'macro'
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`))
  return m ? m[1] : null
}

export async function parseGdtf(path: string): Promise<FixtureProfile[]> {
  const buf = await fs.readFile(path)
  const xml = extractFile(buf, 'description.xml')
  if (!xml) throw new Error('description.xml nicht gefunden (ungueltige GDTF-Datei)')
  const text = xml.toString('utf8')

  const ftTag = text.match(/<FixtureType\b[^>]*>/)
  const brand = (ftTag && attr(ftTag[0], 'Manufacturer')) || 'GDTF'
  const model = (ftTag && (attr(ftTag[0], 'LongName') || attr(ftTag[0], 'Name'))) || 'Fixture'

  const modes: FixtureProfile['modes'] = []
  const modeRe = /<DMXMode\b([^>]*)>([\s\S]*?)<\/DMXMode>/g
  let mm: RegExpExecArray | null
  while ((mm = modeRe.exec(text))) {
    const modeName = attr('<x ' + mm[1] + '>', 'Name') || `${modes.length + 1}`
    const body = mm[2]
    const chans: { offset: number; def: ChannelDef }[] = []
    // erfasst sowohl <DMXChannel .../> als auch <DMXChannel ...>...</DMXChannel>
    const chRe = /<DMXChannel\b([^>]*?)(?:\/>|>([\s\S]*?)<\/DMXChannel>)/g
    let cm: RegExpExecArray | null
    while ((cm = chRe.exec(body))) {
      const tag = '<x ' + cm[1] + '>'
      const offsetStr = attr(tag, 'Offset') // z.B. "1" oder "1,2"
      if (!offsetStr || offsetStr === 'None') continue
      const offsets = offsetStr.split(',').map(n => parseInt(n.trim(), 10)).filter(n => n > 0)
      if (!offsets.length) continue
      const inner = cm[2] || ''
      const lc = inner.match(/<LogicalChannel\b([^>]*)>/)
      const attrName = (lc && attr('<x ' + lc[1] + '>', 'Attribute')) || 'Macro'
      const fn = mapAttribute(attrName)
      chans.push({ offset: offsets[0], def: { function: fn, name: attrName } })
      // Fine-Channel (zweiter Offset)
      if (offsets[1]) {
        const fine: FunctionType = fn === 'pan' ? 'panFine' : fn === 'tilt' ? 'tiltFine' : 'macro'
        chans.push({ offset: offsets[1], def: { function: fine, name: attrName + ' Fine' } })
      }
    }
    chans.sort((a, b) => a.offset - b.offset)
    // Luecken mit 'unused' fuellen, damit Offsets stimmen
    const maxOff = chans.reduce((m, c) => Math.max(m, c.offset), 0)
    const channels: ChannelDef[] = []
    for (let i = 1; i <= maxOff; i++) {
      const c = chans.find(x => x.offset === i)
      channels.push(c ? c.def : { function: 'unused', name: 'Frei' })
    }
    if (channels.length) modes.push({ name: modeName, channels })
  }

  if (!modes.length) throw new Error('Keine DMX-Modi in der GDTF-Datei gefunden')
  const id = `gdtf-${brand}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return [{ id, brand, name: model, modes }]
}
