// Web-MIDI-Anbindung: Eingangs-Events einsammeln, an einen Handler verteilen,
// und einzelne Nachrichten "lernen" (MIDI-Learn fuer Board-Widgets).

import { MidiMapping } from '../../shared/types'

export interface MidiMessage extends MidiMapping { value: number }

let access: any = null
let handler: ((m: MidiMessage) => void) | null = null
let learner: ((m: MidiMessage) => void) | null = null

export async function initMidi(): Promise<boolean> {
  const nav = navigator as any
  if (!nav.requestMIDIAccess) return false
  try {
    access = await nav.requestMIDIAccess({ sysex: false })
    const attach = () => access.inputs.forEach((inp: any) => { inp.onmidimessage = onRaw })
    attach()
    access.onstatechange = attach
    return true
  } catch {
    return false
  }
}

function onRaw(e: any) {
  const [status, d1, d2] = e.data
  const type = status & 0xf0
  const channel = status & 0x0f
  let msg: MidiMessage | null = null
  if (type === 0x90 && d2 > 0) msg = { kind: 'note', channel, data1: d1, value: d2 }
  else if (type === 0x80 || (type === 0x90 && d2 === 0)) msg = { kind: 'note', channel, data1: d1, value: 0 }
  else if (type === 0xb0) msg = { kind: 'cc', channel, data1: d1, value: d2 }
  if (!msg) return
  if (learner) { const l = learner; learner = null; l(msg); return }
  // CC immer (Fader, inkl. 0), Noten nur bei Anschlag (Buttons reagieren beim Druecken)
  if (handler && (msg.kind === 'cc' || msg.value > 0)) handler(msg)
}

export function setMidiHandler(cb: ((m: MidiMessage) => void) | null) { handler = cb }
export function learnNext(cb: (m: MidiMessage) => void) { learner = cb }
export function cancelLearn() { learner = null }
export function midiAvailable() { return !!access }
export function matches(a: MidiMapping, b: MidiMapping) {
  return a.kind === b.kind && a.channel === b.channel && a.data1 === b.data1
}
