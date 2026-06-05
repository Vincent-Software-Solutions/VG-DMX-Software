// DMX-Engine: haelt das Projekt (Definitionen) + den Live-Zustand und berechnet
// 40x pro Sekunde den fertig gemischten 512-Byte-Buffer pro Universe.
//
// Mixer-Schichten (unten -> oben):
//   1. Basis        : Auto-Show ODER Animation ODER aktive Szenen
//   2. Live          : manuelle Overrides (Farbe/Fader) – LTP
//   3. Effekte       : Strobe-Gate, Fog
//   4. Master-Dimmer : Multiplikator auf Intensity-Kanaele
//   5. Blackout      : oberster Override

import { EventEmitter } from 'events'
import { BUILTIN_PROFILES } from '../../shared/fixtures'
import {
  Project, FixtureProfile, FunctionType, SceneValues,
  Scene, Animation, Show, isIntensityFunc, emptyProject, EngineStatus, ControlAction,
  AutoShowConfig, AutoEffect
} from '../../shared/types'
import { DmxOutput, SimOutput, SerialOutput } from './DmxOutput'

const FPS = 40
const TICK_MS = 1000 / FPS

const DEFAULT_PALETTE = ['#ff0040', '#ff7a00', '#ffe000', '#00ff66', '#00d0ff', '#3366ff', '#cc00ff']
const AUTO_CYCLE: AutoEffect[] = ['wave', 'chase', 'sweep', 'rainbow', 'symmetry', 'pulse', 'circle']

interface ChannelInfo { fixtureId: string; func: FunctionType }
interface FixtureMeta {
  id: string; nx: number; ny: number
  cat: 'moving' | 'fog' | 'beam'
  hasDimmer: boolean; hasRGB: boolean; hasPanTilt: boolean
  group?: string; order: number
}

export class Engine extends EventEmitter {
  private project: Project = emptyProject()
  private out: DmxOutput = new SimOutput()
  private timer: ReturnType<typeof setInterval> | null = null

  private chanMap = new Map<number, (ChannelInfo | undefined)[]>()
  private universes: number[] = [0]
  private fixtureMeta: FixtureMeta[] = []

  // Steuerzustand
  private activeScenes = new Set<string>()
  private live = new Map<string, number>()
  private liveChannels = new Map<string, number>() // "universe:channel(1-basiert)" -> 0..255
  private master = 1
  private blackout = false
  private fog = false
  private strobe = 0
  private autoShow: AutoShowConfig | null = null
  private sceneFade: { from: Map<number, Uint8Array>; startedAt: number; dur: number } | null = null
  private show: { id: string; idx: number; enteredAt: number } | null = null

  private anim: { id: string; idx: number; enteredAt: number; from: Map<number, Uint8Array> } | null = null
  private resolved: SceneValues = {}
  private startTime = Date.now()
  private lastBuffers: Map<number, Uint8Array> | null = null
  private lastBaseBuffers: Map<number, Uint8Array> | null = null // Basis-Schicht (vor Live/Effekten) – fuer konsistente Fades
  private frameCount = 0

  start() {
    if (this.timer) return
    this.rebuildChannelMap()
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  async stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    await this.out.close()
  }

  // ---- Projekt / Verbindung ----------------------------------------------

  setProject(p: Project) {
    // Eigene Kopie halten, damit spaetere In-place-Mutationen am Workspace die Engine
    // nicht still veraendern (chanMap wuerde sonst ohne rebuild divergieren).
    this.project = structuredClone(p)
    this.rebuildChannelMap()
    // Laufende Show-Referenz validieren (Cue-Liste koennte sich geaendert haben)
    if (this.show) {
      const s = this.showById(this.show.id)
      if (!s || this.show.idx >= s.cues.length) this.show = null
    }
  }

  async connect(port: string | null): Promise<EngineStatus> {
    await this.out.close()
    if (!port) {
      this.out = new SimOutput()
    } else {
      try {
        this.out = await SerialOutput.open(port)
      } catch (e) {
        this.out = new SimOutput()
        this.emit('error', `Verbindung fehlgeschlagen: ${(e as Error).message} – Simulationsmodus aktiv.`)
      }
    }
    const status = this.status()
    this.emit('status', status)
    return status
  }

  status(): EngineStatus {
    return {
      connected: this.out.mode === 'serial',
      mode: this.out.mode,
      port: this.out.port,
      master: this.master,
      blackout: this.blackout,
      fog: this.fog,
      strobe: this.strobe,
      autoShow: !!this.autoShow,
      showId: this.show?.id ?? null,
      cueIndex: this.show?.idx ?? -1
    }
  }

  snapshot(): SceneValues {
    const out: SceneValues = {}
    for (const fid of Object.keys(this.resolved)) out[fid] = { ...this.resolved[fid] }
    return out
  }

  // ---- Steuerung ----------------------------------------------------------

  control(a: ControlAction) {
    const now = Date.now()
    switch (a.kind) {
      case 'sceneToggle': {
        this.autoShow = null; this.anim = null; this.show = null  // manuelle Aktion beendet laufende Show
        if (this.activeScenes.has(a.id)) this.activeScenes.delete(a.id)
        else this.activeScenes.add(a.id)
        const dur = this.scene(a.id)?.fadeIn ?? 0
        this.sceneFade = { from: this.copyOf(this.lastBaseBuffers ?? this.newBuffers()), startedAt: now, dur }
        this.emit('status', this.status())
        break
      }
      case 'scenesOff':
        this.activeScenes.clear(); this.show = null
        this.sceneFade = { from: this.copyOf(this.lastBaseBuffers ?? this.newBuffers()), startedAt: now, dur: 0 }
        this.emit('status', this.status())
        break
      case 'playAnimation':
        this.startAnimation(a.id)
        this.emit('status', this.status())
        break
      case 'stopAnimation': this.anim = null; break
      case 'live':
        for (const fid of a.fixtureIds) {
          const key = `${fid}|${a.func}`
          if (a.value === null) this.live.delete(key)
          else this.live.set(key, clamp255(a.value))
        }
        break
      case 'clearLive': this.live.clear(); break
      case 'liveChannel': {
        const key = `${a.universe}:${a.channel}`
        if (a.value === null) this.liveChannels.delete(key)
        else this.liveChannels.set(key, clamp255(a.value))
        break
      }
      case 'clearLiveChannels': this.liveChannels.clear(); break
      case 'showGo': this.showGo(a.id); break
      case 'showStop': this.show = null; this.emit('status', this.status()); break
      case 'master': this.master = Math.max(0, Math.min(1, a.value)); this.emit('status', this.status()); break
      case 'blackout': this.blackout = a.value; this.emit('status', this.status()); break
      case 'fog': this.fog = a.value; this.emit('status', this.status()); break
      case 'strobe': this.strobe = Math.max(0, a.value); this.emit('status', this.status()); break
      case 'autoShow':
        this.autoShow = a.config
        if (a.config) { this.anim = null; this.show = null }
        this.emit('status', this.status())
        break
    }
  }

  private startAnimation(id: string) {
    this.autoShow = null; this.show = null
    this.anim = { id, idx: 0, enteredAt: Date.now(), from: this.copyOf(this.lastBaseBuffers ?? this.newBuffers()) }
  }

  // ---- Shows / Cues -------------------------------------------------------

  private showById(id: string): Show | undefined { return this.project.shows?.find(s => s.id === id) }

  private showGo(id: string) {
    const show = this.showById(id)
    if (!show || show.cues.length === 0) return
    let idx: number
    if (this.show?.id === id) {
      idx = this.show.idx + 1
      if (idx >= show.cues.length) { if (show.loop) idx = 0; else { this.show = null; this.emit('status', this.status()); return } }
    } else {
      idx = 0
    }
    this.enterCue(show, idx)
  }

  private enterCue(show: Show, idx: number) {
    const cue = show.cues[idx]
    if (!cue) { this.show = null; return }
    const now = Date.now()
    this.autoShow = null
    const fadeFrom = this.copyOf(this.lastBaseBuffers ?? this.newBuffers())
    if (cue.target.type === 'scene') {
      this.anim = null
      this.activeScenes = new Set([cue.target.sceneId])
      this.sceneFade = { from: fadeFrom, startedAt: now, dur: cue.fade }
    } else if (cue.target.type === 'animation') {
      this.activeScenes.clear()
      this.startAnimation(cue.target.animationId)
    } else { // blackout-Cue: alles aus (mit Fade)
      this.anim = null
      this.activeScenes.clear()
      this.sceneFade = { from: fadeFrom, startedAt: now, dur: cue.fade }
    }
    this.show = { id: show.id, idx, enteredAt: now }
    this.emit('status', this.status())
  }

  // ---- Mixer ---------------------------------------------------------------

  private newBuffers(): Map<number, Uint8Array> {
    const m = new Map<number, Uint8Array>()
    for (const u of this.universes) m.set(u, new Uint8Array(512))
    return m
  }
  private copyOf(buffers: Map<number, Uint8Array>): Map<number, Uint8Array> {
    const m = new Map<number, Uint8Array>()
    for (const u of this.universes) {
      const b = buffers.get(u)
      m.set(u, b ? new Uint8Array(b) : new Uint8Array(512))
    }
    return m
  }

  private tick() {
    const now = Date.now()
    const buffers = this.newBuffers()

    // Show Auto-Follow pruefen
    if (this.show) this.checkAutoFollow(now)

    // 1) Basis
    if (this.autoShow) this.applyAutoShow(buffers, now)
    else if (this.anim) this.applyAnimation(buffers, now)
    else this.applyScenesWithFade(buffers, now)

    // Basis-Schicht festhalten (vor Live/Effekten) – Quelle fuer konsistente Animations-Fades
    this.lastBaseBuffers = this.copyOf(buffers)

    // 2) Live-Overrides (LTP) – erst per Funktion, dann roh per Kanal (Kanal gewinnt)
    for (const [key, val] of this.live) {
      const [fid, func] = key.split('|') as [string, FunctionType]
      this.setFuncValue(buffers, fid, func, val)
    }
    for (const [key, val] of this.liveChannels) {
      const [u, c] = key.split(':').map(Number)
      const b = buffers.get(u)
      if (b && c >= 1 && c <= 512) b[c - 1] = val
    }

    // Resolved-Look (vor Effekten/Master/Blackout) – fuer Aufnahme
    this.captureResolved(buffers)

    // 3) Effekte
    if (this.fog) this.forEachFunc(buffers, f => f === 'fog', () => 255)
    if (this.strobe > 0) {
      const on = Math.floor((now - this.startTime) / (1000 / (this.strobe * 2))) % 2 === 0
      if (!on) this.forEachFunc(buffers, isIntensityFunc, () => 0)
    }

    // 4) Master-Dimmer
    if (this.master < 1) this.forEachFunc(buffers, isIntensityFunc, v => Math.round(v * this.master))

    // 5) Blackout
    if (this.blackout) this.forEachFunc(buffers, f => isIntensityFunc(f) || f === 'fog', () => 0)

    this.lastBuffers = buffers
    // Hardware (Open DMX USB = eine DMX-Linie): Universe 0 senden.
    this.out.send(buffers.get(0) || new Uint8Array(512))
    // UI: alle Universes als { [u]: number[] } senden (~20 Hz), damit auch U>0 korrekt angezeigt wird.
    if (++this.frameCount % 2 === 0) {
      const frame: Record<number, number[]> = {}
      for (const [u, b] of buffers) frame[u] = Array.from(b)
      this.emit('frame', frame)
    }
  }

  // ---- Auto-Show -----------------------------------------------------------

  private applyAutoShow(buffers: Map<number, Uint8Array>, now: number) {
    const cfg = this.autoShow!
    const beats = ((now - this.startTime) / 1000) * (Math.max(20, cfg.bpm) / 60)
    const palette = (cfg.palette && cfg.palette.length ? cfg.palette : DEFAULT_PALETTE).map(hex2rgb)
    let metas = this.fixtureMeta.filter(m => m.cat !== 'fog') // Nebel nicht von Helligkeitseffekten modulieren
    if (cfg.groups && cfg.groups.length) metas = metas.filter(m => m.group && cfg.groups.includes(m.group))
    if (metas.length === 0) return
    const beams = metas
    let effect = cfg.effect
    if (effect === 'auto') effect = AUTO_CYCLE[Math.floor(beats / 8) % AUTO_CYCLE.length]
    this.runEffect(buffers, effect, beams, beats, cfg, palette)
  }

  private runEffect(
    buffers: Map<number, Uint8Array>, effect: AutoEffect, metas: FixtureMeta[],
    beats: number, cfg: AutoShowConfig, palette: number[][]
  ) {
    const energy = Math.max(0, Math.min(1, cfg.energy))
    const pick = (i: number) => palette[((i % palette.length) + palette.length) % palette.length]
    const sorted = [...metas].sort((a, b) => a.nx - b.nx)

    switch (effect) {
      case 'wave': {
        const phase = beats * Math.PI * (0.5 + energy)
        metas.forEach((m) => {
          const inten = (Math.sin(m.nx * Math.PI * 3 + phase) + 1) / 2
          this.applyBeam(buffers, m, pick(Math.floor(beats / 4)), inten)
          this.maybeSway(buffers, m, beats, cfg)
        })
        break
      }
      case 'sweep': {
        const pos = (beats * (0.2 + energy * 0.4)) % 1
        const w = 0.14 + (1 - energy) * 0.16
        metas.forEach((m) => {
          const d = Math.min(Math.abs(m.nx - pos), Math.abs(m.nx - pos - 1), Math.abs(m.nx - pos + 1))
          const inten = Math.max(0, 1 - d / w)
          this.applyBeam(buffers, m, pick(Math.floor(beats / 2)), inten)
          this.maybeSway(buffers, m, beats, cfg)
        })
        break
      }
      case 'chase': {
        const speed = 1 + energy * 4
        const idx = Math.floor(beats * speed) % Math.max(1, sorted.length)
        sorted.forEach((m, i) => {
          const inten = i === idx ? 1 : (i === (idx - 1 + sorted.length) % sorted.length ? 0.25 : 0)
          this.applyBeam(buffers, m, pick(idx), inten)
          this.maybeSway(buffers, m, beats, cfg)
        })
        break
      }
      case 'rainbow': {
        metas.forEach((m) => {
          const hue = (m.nx + beats * (0.05 + energy * 0.15)) % 1
          this.applyBeam(buffers, m, hsv2rgb(hue, 1, 1), 1)
          this.maybeSway(buffers, m, beats, cfg)
        })
        break
      }
      case 'symmetry': {
        const phase = beats * Math.PI * (0.5 + energy)
        metas.forEach((m) => {
          const d = Math.abs(m.nx - 0.5) * 2
          const inten = (Math.sin(d * Math.PI * 2 - phase) + 1) / 2
          const col = m.nx < 0.5 ? pick(Math.floor(beats / 4)) : pick(Math.floor(beats / 4) + 1)
          this.applyBeam(buffers, m, col, inten)
          this.maybeSway(buffers, m, beats, cfg)
        })
        break
      }
      case 'circle': {
        metas.forEach((m, i) => {
          if (m.cat === 'moving' && cfg.movingHeads) {
            const ang = beats * Math.PI * (0.5 + energy) + m.nx * Math.PI * 2
            this.setFuncValue(buffers, m.id, 'pan', 128 + 110 * Math.cos(ang))
            this.setFuncValue(buffers, m.id, 'tilt', 100 + 60 * Math.sin(ang))
            this.setFuncValue(buffers, m.id, 'speed', Math.round(40 + (1 - energy) * 120))
            this.applyBeam(buffers, m, pick(i), 1)
          } else {
            const inten = (Math.sin(m.nx * Math.PI * 3 + beats * Math.PI) + 1) / 2
            this.applyBeam(buffers, m, pick(Math.floor(beats / 4)), inten)
          }
        })
        break
      }
      case 'pulse': {
        const frac = beats - Math.floor(beats)
        const inten = Math.pow(1 - frac, 1.5)
        metas.forEach((m) => {
          this.applyBeam(buffers, m, pick(Math.floor(beats)), inten)
          this.maybeSway(buffers, m, beats, cfg)
        })
        break
      }
      case 'strobe': {
        const rate = 4 + Math.floor(energy * 8)
        const on = Math.floor(beats * rate) % 2 === 0
        metas.forEach((m) => this.applyBeam(buffers, m, pick(0), on ? 1 : 0))
        break
      }
    }
  }

  private applyBeam(buffers: Map<number, Uint8Array>, m: FixtureMeta, rgb: number[], intensity: number) {
    intensity = Math.max(0, Math.min(1, intensity))
    if (m.hasDimmer) this.setFuncValue(buffers, m.id, 'dimmer', 255 * intensity)
    if (m.hasRGB) {
      const mul = m.hasDimmer ? 1 : intensity
      this.setFuncValue(buffers, m.id, 'red', rgb[0] * mul)
      this.setFuncValue(buffers, m.id, 'green', rgb[1] * mul)
      this.setFuncValue(buffers, m.id, 'blue', rgb[2] * mul)
    }
  }

  // sanftes Pan/Tilt-Wackeln fuer Moving Heads bei Nicht-Kreis-Effekten
  private maybeSway(buffers: Map<number, Uint8Array>, m: FixtureMeta, beats: number, cfg: AutoShowConfig) {
    if (m.cat !== 'moving' || !cfg.movingHeads) return
    const ang = beats * Math.PI * 0.5 + m.nx * Math.PI
    this.setFuncValue(buffers, m.id, 'pan', 128 + 50 * Math.cos(ang))
    this.setFuncValue(buffers, m.id, 'tilt', 110 + 35 * Math.sin(ang * 0.5))
  }

  // ---- Animation -----------------------------------------------------------

  private applyAnimation(buffers: Map<number, Uint8Array>, now: number) {
    const a = this.animation(this.anim!.id)
    if (!a || a.steps.length === 0) { this.anim = null; return }
    const st = this.anim!
    const step = a.steps[st.idx] || a.steps[0]
    const fadeDur = step.transition === 'sofort' ? 0 : Math.max(0, step.fadeTime) * 1000
    const total = Math.max(TICK_MS, fadeDur + Math.max(0, step.holdTime) * 1000) // mind. 1 Frame sichtbar
    const elapsed = now - st.enteredAt

    const target = this.newBuffers()
    this.applyScene(target, this.scene(step.sceneId), 'set')

    if (elapsed < fadeDur && fadeDur > 0) {
      const t = elapsed / fadeDur
      for (const u of this.universes) {
        const from = st.from.get(u) ?? new Uint8Array(512), to = target.get(u)!, dst = buffers.get(u)!
        for (let i = 0; i < 512; i++) dst[i] = Math.round(from[i] + (to[i] - from[i]) * t)
      }
    } else {
      for (const u of this.universes) buffers.get(u)!.set(target.get(u)!)
    }

    if (elapsed >= total) {
      let next = st.idx + 1
      if (next >= a.steps.length) {
        if (a.loop) next = 0
        else { this.anim = null; return }
      }
      this.anim = { id: a.id, idx: next, enteredAt: now, from: this.copyOf(this.lastBaseBuffers ?? buffers) }
    }
  }

  private applyScenesWithFade(buffers: Map<number, Uint8Array>, now: number) {
    const target = this.newBuffers()
    for (const sid of this.activeScenes) this.applyScene(target, this.scene(sid), 'htp')
    if (this.sceneFade) {
      const t = this.sceneFade.dur > 0 ? (now - this.sceneFade.startedAt) / (this.sceneFade.dur * 1000) : 1
      if (t >= 1) {
        this.sceneFade = null
        for (const u of this.universes) buffers.get(u)!.set(target.get(u)!)
      } else {
        for (const u of this.universes) {
          const from = this.sceneFade.from.get(u) ?? new Uint8Array(512)
          const to = target.get(u)!, dst = buffers.get(u)!
          for (let i = 0; i < 512; i++) dst[i] = Math.round(from[i] + (to[i] - from[i]) * t)
        }
      }
    } else {
      for (const u of this.universes) buffers.get(u)!.set(target.get(u)!)
    }
  }

  private checkAutoFollow(now: number) {
    const show = this.showById(this.show!.id)
    if (!show) { this.show = null; return }
    const cue = show.cues[this.show!.idx]
    if (!cue || cue.follow !== 'auto') return
    // Animation-Cue: erst weiterschalten, wenn die Animation durchgelaufen ist (Loop -> manuell)
    if (cue.target.type === 'animation' && this.anim) return
    const wait = Math.max(TICK_MS, (cue.fade + cue.autoWait) * 1000) // mind. 1 Frame sichtbar
    if (now - this.show!.enteredAt >= wait) this.showGo(show.id)
  }

  private applyScene(buffers: Map<number, Uint8Array>, scene: Scene | undefined, mode: 'htp' | 'set') {
    if (!scene) return
    for (const fid of Object.keys(scene.values)) {
      const funcs = scene.values[fid]
      for (const f of Object.keys(funcs) as FunctionType[]) {
        const val = funcs[f]!
        if (mode === 'htp' && isIntensityFunc(f)) {
          const cur = this.getFuncValue(buffers, fid, f)
          this.setFuncValue(buffers, fid, f, Math.max(cur, val))
        } else {
          this.setFuncValue(buffers, fid, f, val)
        }
      }
    }
  }

  // ---- Kanal-Aufloesung ----------------------------------------------------

  private rebuildChannelMap() {
    this.chanMap.clear()
    const uset = new Set<number>([0])
    for (const fx of this.project.fixtures) {
      uset.add(fx.universe)
      const prof = this.profile(fx.profileId)
      const mode = prof?.modes[fx.modeIndex]
      if (!mode) continue
      let arr = this.chanMap.get(fx.universe)
      if (!arr) { arr = new Array(512).fill(undefined); this.chanMap.set(fx.universe, arr) }
      mode.channels.forEach((ch, i) => {
        const idx = fx.address - 1 + i
        if (idx >= 0 && idx < 512) arr![idx] = { fixtureId: fx.id, func: ch.function }
      })
    }
    this.universes = Array.from(uset).sort((a, b) => a - b)
    this.buildMeta()
  }

  private buildMeta() {
    const fx = this.project.fixtures
    const xs = fx.map(f => f.x).filter((v): v is number => typeof v === 'number')
    const ys = fx.map(f => f.y).filter((v): v is number => typeof v === 'number')
    const minX = xs.length ? Math.min(...xs) : 0, maxX = xs.length ? Math.max(...xs) : 1
    const minY = ys.length ? Math.min(...ys) : 0, maxY = ys.length ? Math.max(...ys) : 1
    const spanX = (maxX - minX) || 1, spanY = (maxY - minY) || 1
    this.fixtureMeta = fx.map((f, i) => {
      const prof = this.profile(f.profileId)
      const mode = prof?.modes[f.modeIndex]
      const funcs = new Set(mode?.channels.map(c => c.function) ?? [])
      const placedX = typeof f.x === 'number'
      const nx = placedX ? (f.x! - minX) / spanX : (fx.length > 1 ? i / (fx.length - 1) : 0.5)
      const ny = typeof f.y === 'number' ? (f.y! - minY) / spanY : 0.5
      const hasPanTilt = funcs.has('pan') && funcs.has('tilt')
      const hasRGB = funcs.has('red') && funcs.has('green') && funcs.has('blue')
      const hasDimmer = funcs.has('dimmer')
      const cat: FixtureMeta['cat'] = hasPanTilt ? 'moving' : (funcs.has('fog') ? 'fog' : 'beam')
      return { id: f.id, nx, ny, cat, hasDimmer, hasRGB, hasPanTilt, group: f.group, order: i }
    })
  }

  private channelIndexFor(fid: string, func: FunctionType): { universe: number; idx: number } | null {
    const fx = this.project.fixtures.find(f => f.id === fid)
    if (!fx) return null
    const prof = this.profile(fx.profileId)
    const mode = prof?.modes[fx.modeIndex]
    if (!mode) return null
    const ci = mode.channels.findIndex(c => c.function === func)
    if (ci < 0) return null
    return { universe: fx.universe, idx: fx.address - 1 + ci }
  }

  private setFuncValue(buffers: Map<number, Uint8Array>, fid: string, func: FunctionType, val: number) {
    const loc = this.channelIndexFor(fid, func)
    if (!loc) return
    const b = buffers.get(loc.universe)
    if (b && loc.idx >= 0 && loc.idx < 512) b[loc.idx] = clamp255(val)
  }
  private getFuncValue(buffers: Map<number, Uint8Array>, fid: string, func: FunctionType): number {
    const loc = this.channelIndexFor(fid, func)
    if (!loc) return 0
    const b = buffers.get(loc.universe)
    return b && loc.idx >= 0 && loc.idx < 512 ? b[loc.idx] : 0
  }

  private forEachFunc(buffers: Map<number, Uint8Array>, pred: (f: FunctionType) => boolean, fn: (v: number) => number) {
    for (const u of this.universes) {
      const arr = this.chanMap.get(u)
      const b = buffers.get(u)
      if (!arr || !b) continue
      for (let i = 0; i < 512; i++) {
        const info = arr[i]
        if (info && pred(info.func)) b[i] = clamp255(fn(b[i]))
      }
    }
  }

  private captureResolved(buffers: Map<number, Uint8Array>) {
    const out: SceneValues = {}
    for (const u of this.universes) {
      const arr = this.chanMap.get(u)
      const b = buffers.get(u)
      if (!arr || !b) continue
      for (let i = 0; i < 512; i++) {
        const info = arr[i]
        if (!info) continue
        ;(out[info.fixtureId] ||= {})[info.func] = b[i]
      }
    }
    this.resolved = out
  }

  // ---- Lookups -------------------------------------------------------------

  private profile(id: string): FixtureProfile | undefined {
    return BUILTIN_PROFILES.find(p => p.id === id) || this.project.customProfiles.find(p => p.id === id)
  }
  private scene(id: string): Scene | undefined { return this.project.scenes.find(s => s.id === id) }
  private animation(id: string): Animation | undefined { return this.project.animations.find(a => a.id === id) }
}

function clamp255(v: number): number {
  if (!Number.isFinite(v)) return 0
  v = Math.round(v)
  return v < 0 ? 0 : v > 255 ? 255 : v
}

function hex2rgb(hex: string): number[] {
  const m = hex.replace('#', '')
  return [parseInt(m.slice(0, 2), 16) || 0, parseInt(m.slice(2, 4), 16) || 0, parseInt(m.slice(4, 6), 16) || 0]
}

function hsv2rgb(h: number, s: number, v: number): number[] {
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s)
  let r = 0, g = 0, b = 0
  switch (((i % 6) + 6) % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  return [r * 255, g * 255, b * 255]
}
