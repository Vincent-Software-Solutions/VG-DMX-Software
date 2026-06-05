import { create } from 'zustand'
import {
  Project, EngineStatus, ControlAction, FunctionType,
  Scene, Animation, Board, Show, PatchedFixture, FixtureProfile, StoredProject,
  ClipboardPayload, emptyProject
} from '../../shared/types'
import { parseOfl } from './ofl'
import type { WorkspaceSummary } from '../../preload'
import { uid, findProfile } from './util'

type Screen = 'start' | 'app'

interface AppState {
  screen: Screen
  projects: { id: string; name: string; updatedAt: number }[]
  activeId: string | null
  project: StoredProject
  status: EngineStatus
  frame: Record<number, number[]>   // pro Universe ein 512er-Array
  ports: { path: string; manufacturer?: string }[]
  selection: string[]
  clipboard: ClipboardPayload | null
  past: Project[]
  future: Project[]
  toast: string | null
  ready: boolean

  init(): Promise<void>
  applySummary(s: WorkspaceSummary, opts?: { enter?: boolean }): void

  // Events
  createProject(name: string): Promise<void>
  renameProject(id: string, name: string): Promise<void>
  deleteProject(id: string): Promise<void>
  duplicateProject(id: string): Promise<void>
  openProject(id: string): Promise<void>
  goStart(): void

  // Doc
  patchProject(mut: (p: Project) => void): void
  undo(): void
  redo(): void
  setSelection(ids: string[]): void
  toggleSelect(id: string): void
  notify(msg: string): void

  // Datei-Im-/Export & Fixture-Import
  exportActive(): Promise<void>
  exportById(id: string): Promise<void>
  importEvent(): Promise<void>
  importGdtf(): Promise<void>
  importOflFiles(files: FileList): Promise<void>
  addCustomProfiles(profiles: FixtureProfile[]): void

  // Verbindung
  refreshPorts(): Promise<void>
  connect(port: string | null): Promise<void>

  // Steuerung
  control(a: ControlAction): void
  setLive(func: FunctionType, value: number | null): void
  setColor(r: number, g: number, b: number): void
  recordScene(bankId: string, name: string): Promise<void>

  // Zwischenablage
  copyFixtures(ids: string[]): void
  copyScenes(ids: string[]): void
  paste(): Promise<void>

  // Doc-Helfer
  addBank(name: string): void
  addFixture(fx: PatchedFixture): void
  removeFixture(id: string): void
  addCustomProfile(p: FixtureProfile): void
  saveScene(s: Scene): void
  removeScene(id: string): void
  saveAnimation(a: Animation): void
  removeAnimation(id: string): void
  saveBoard(b: Board): void
  saveShow(s: Show): void
  removeShow(id: string): void
}

const DEFAULT_STATUS: EngineStatus = { connected: false, mode: 'sim', master: 1, blackout: false, fog: false, strobe: 0, autoShow: false }
const blankStored = (): StoredProject => ({ id: 'none', name: '—', createdAt: 0, updatedAt: 0, ...emptyProject() })
let initialized = false

export const useStore = create<AppState>((set, get) => ({
  screen: 'start',
  projects: [],
  activeId: null,
  project: blankStored(),
  status: DEFAULT_STATUS,
  frame: { 0: new Array(512).fill(0) },
  ports: [],
  selection: [],
  clipboard: null,
  past: [],
  future: [],
  toast: null,
  ready: false,

  async init() {
    if (initialized) return
    initialized = true
    const ws = await window.api.getWorkspace()
    const status = await window.api.getStatus()
    get().applySummary(ws)
    set({ status, ready: true })
    window.api.onStatus((s) => set({ status: s }))
    window.api.onFrame((f) => set({ frame: f }))
    window.api.onError((msg) => get().notify(msg))
    await get().refreshPorts()
  },

  applySummary(s, opts) {
    const active = s.active ?? blankStored()
    const changed = s.activeId !== get().activeId
    set({
      projects: s.projects,
      activeId: s.activeId,
      project: active,
      ...(changed ? { selection: [], past: [], future: [] } : {}),
      ...(opts?.enter ? { screen: 'app' as Screen } : {})
    })
  },

  async createProject(name) {
    const s = await window.api.createProject(name)
    get().applySummary(s, { enter: true })
    get().notify(`Event "${name}" erstellt`)
  },
  async renameProject(id, name) {
    const s = await window.api.renameProject(id, name)
    get().applySummary(s)
  },
  async deleteProject(id) {
    const s = await window.api.deleteProject(id)
    get().applySummary(s)
  },
  async duplicateProject(id) {
    const s = await window.api.duplicateProject(id)
    get().applySummary(s, { enter: true })
  },
  async openProject(id) {
    const s = await window.api.activateProject(id)
    set({ selection: [] })
    get().applySummary(s, { enter: true })
  },
  goStart() { set({ screen: 'start' }) },

  patchProject(mut) {
    const cur = get().project
    if (!get().activeId || cur.id === 'none') { get().notify('Kein Event geoeffnet'); return }
    const prevSnapshot = contentOf(cur)
    const next = structuredClone(cur)
    mut(next)
    const past = [...get().past, prevSnapshot].slice(-50)
    set({ project: next, past, future: [] })
    persistContent(next)
  },

  undo() {
    const past = get().past
    if (past.length === 0) { get().notify('Nichts zum Rueckgaengig-Machen'); return }
    const cur = get().project
    const prev = past[past.length - 1]
    const restored = withContent(cur, prev)
    set({ project: restored, past: past.slice(0, -1), future: [contentOf(cur), ...get().future].slice(0, 50) })
    persistContent(restored)
    get().notify('Rueckgaengig')
  },
  redo() {
    const future = get().future
    if (future.length === 0) { get().notify('Nichts zum Wiederherstellen'); return }
    const cur = get().project
    const nextP = future[0]
    const restored = withContent(cur, nextP)
    set({ project: restored, future: future.slice(1), past: [...get().past, contentOf(cur)].slice(-50) })
    persistContent(restored)
    get().notify('Wiederhergestellt')
  },

  async exportActive() {
    const ok = await window.api.exportProject(get().project.id)
    if (ok) get().notify('Event exportiert')
  },
  async exportById(id) {
    const ok = await window.api.exportProject(id)
    if (ok) get().notify('Event exportiert')
  },
  async importEvent() {
    const s = await window.api.importProject()
    get().applySummary(s, { enter: true })
    get().notify('Event importiert')
  },
  async importGdtf() {
    if (!get().activeId || get().project.id === 'none') { get().notify('Kein Event geoeffnet'); return }
    const profiles = await window.api.importGdtf()
    if (profiles.length) { get().addCustomProfiles(profiles); get().notify(`${profiles.length} GDTF-Fixture(s) importiert`) }
  },
  async importOflFiles(files) {
    if (!get().activeId || get().project.id === 'none') { get().notify('Kein Event geoeffnet'); return }
    const profiles: FixtureProfile[] = []
    for (const f of Array.from(files)) {
      try { const text = await f.text(); const p = parseOfl(JSON.parse(text)); if (p) profiles.push(p) }
      catch { /* Datei ueberspringen */ }
    }
    if (profiles.length) { get().addCustomProfiles(profiles); get().notify(`${profiles.length} OFL-Fixture(s) importiert`) }
    else get().notify('Keine gueltigen OFL-Fixtures gefunden')
  },
  addCustomProfiles(profiles) {
    get().patchProject(p => {
      for (const prof of profiles) {
        const i = p.customProfiles.findIndex(x => x.id === prof.id)
        if (i >= 0) p.customProfiles[i] = prof; else p.customProfiles.push(prof)
      }
    })
  },

  setSelection(ids) { set({ selection: ids }) },
  toggleSelect(id) {
    const sel = get().selection
    set({ selection: sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id] })
  },

  notify(msg) {
    set({ toast: msg })
    setTimeout(() => { if (get().toast === msg) set({ toast: null }) }, 2600)
  },

  async refreshPorts() { set({ ports: await window.api.listPorts() }) },
  async connect(port) {
    const status = await window.api.connect(port)
    set({ status })
    get().notify(port ? `Verbunden mit ${port}` : 'Simulationsmodus aktiv')
  },

  control(a) { window.api.control(a) },

  setLive(func, value) {
    const ids = get().selection
    if (ids.length === 0) { get().notify('Keine Fixtures ausgewaehlt'); return }
    window.api.control({ kind: 'live', fixtureIds: ids, func, value })
  },
  setColor(r, g, b) {
    const ids = get().selection
    if (ids.length === 0) { get().notify('Keine Fixtures ausgewaehlt'); return }
    window.api.control({ kind: 'live', fixtureIds: ids, func: 'red', value: r })
    window.api.control({ kind: 'live', fixtureIds: ids, func: 'green', value: g })
    window.api.control({ kind: 'live', fixtureIds: ids, func: 'blue', value: b })
  },

  async recordScene(bankId, name) {
    const values = await window.api.snapshot()
    const scene: Scene = { id: uid('scene'), name, bankId, values, fadeIn: 0 }
    get().saveScene(scene)
    get().notify(`Szene "${name}" aufgenommen`)
  },

  // ---- Zwischenablage ----
  copyFixtures(ids) {
    const p = get().project
    const fixtures = p.fixtures.filter(f => ids.includes(f.id))
    if (fixtures.length === 0) { get().notify('Keine Fixtures ausgewaehlt'); return }
    const usedProfileIds = new Set(fixtures.map(f => f.profileId))
    const profiles = p.customProfiles.filter(cp => usedProfileIds.has(cp.id))
    const payload: ClipboardPayload = { type: 'fixtures', fixtures, profiles }
    set({ clipboard: payload })
    writeSystemClipboard(payload)
    get().notify(`${fixtures.length} Fixture(s) kopiert`)
  },
  copyScenes(ids) {
    const p = get().project
    const scenes = p.scenes.filter(s => ids.includes(s.id))
    if (scenes.length === 0) return
    const payload: ClipboardPayload = { type: 'scenes', scenes }
    set({ clipboard: payload })
    writeSystemClipboard(payload)
    get().notify(`${scenes.length} Szene(n) kopiert`)
  },
  async paste() {
    const payload = (await readSystemClipboard()) ?? get().clipboard
    if (!payload) { get().notify('Zwischenablage leer'); return }
    if (payload.type === 'fixtures') {
      get().patchProject(p => {
        for (const cp of payload.profiles) if (!p.customProfiles.some(x => x.id === cp.id)) p.customProfiles.push(cp)
        for (const fx of payload.fixtures) {
          p.fixtures.push({ ...fx, id: uid('fx'), name: fx.name + ' (Kopie)' })
        }
      })
      get().notify(`${payload.fixtures.length} Fixture(s) eingefuegt`)
    } else if (payload.type === 'scenes') {
      get().patchProject(p => {
        const bankId = p.banks[0]?.id ?? 'bank-1'
        for (const sc of payload.scenes) p.scenes.push({ ...sc, id: uid('scene'), bankId, name: sc.name + ' (Kopie)' })
      })
      get().notify(`${payload.scenes.length} Szene(n) eingefuegt`)
    } else {
      get().notify('Nichts Einfuegbares in der Zwischenablage')
    }
  },

  addBank(name) { get().patchProject(p => { p.banks.push({ id: uid('bank'), name }) }) },
  addFixture(fx) { get().patchProject(p => { p.fixtures.push(fx) }) },
  removeFixture(id) { get().patchProject(p => { p.fixtures = p.fixtures.filter(f => f.id !== id) }) },
  addCustomProfile(prof) { get().patchProject(p => { p.customProfiles.push(prof) }) },
  saveScene(s) {
    get().patchProject(p => {
      const i = p.scenes.findIndex(x => x.id === s.id)
      if (i >= 0) p.scenes[i] = s; else p.scenes.push(s)
    })
  },
  removeScene(id) { get().patchProject(p => { p.scenes = p.scenes.filter(s => s.id !== id) }) },
  saveAnimation(a) {
    get().patchProject(p => {
      const i = p.animations.findIndex(x => x.id === a.id)
      if (i >= 0) p.animations[i] = a; else p.animations.push(a)
    })
  },
  removeAnimation(id) { get().patchProject(p => { p.animations = p.animations.filter(a => a.id !== id) }) },
  saveBoard(b) {
    get().patchProject(p => {
      const i = p.boards.findIndex(x => x.id === b.id)
      if (i >= 0) p.boards[i] = b; else p.boards.push(b)
    })
  },
  saveShow(s) {
    get().patchProject(p => {
      if (!p.shows) p.shows = []
      const i = p.shows.findIndex(x => x.id === s.id)
      if (i >= 0) p.shows[i] = s; else p.shows.push(s)
    })
  },
  removeShow(id) { get().patchProject(p => { p.shows = (p.shows || []).filter(s => s.id !== id) }) }
}))

// Nur Inhaltsfelder an den Main-Prozess senden (Metadaten bleiben dort geschuetzt)
function persistContent(p: Project & { id: string }) {
  const { fixtures, customProfiles, banks, scenes, animations, boards, shows } = p
  window.api.saveProject(p.id, { fixtures, customProfiles, banks, scenes, animations, boards, shows } as any)
}

// Nur die Inhaltsfelder als Undo-Snapshot (ohne Metadaten/Name)
function contentOf(p: Project): Project {
  return structuredClone({
    fixtures: p.fixtures, customProfiles: p.customProfiles, banks: p.banks,
    scenes: p.scenes, animations: p.animations, boards: p.boards, shows: p.shows
  })
}
// Snapshot-Inhalt auf das aktuelle Projekt anwenden, Metadaten (id/name/...) bleiben erhalten
function withContent(cur: StoredProject, snap: Project): StoredProject {
  return {
    ...cur,
    fixtures: snap.fixtures, customProfiles: snap.customProfiles, banks: snap.banks,
    scenes: snap.scenes, animations: snap.animations, boards: snap.boards, shows: snap.shows
  }
}

// System-Zwischenablage (damit Copy/Paste auch zwischen App-Starts klappt)
const CLIP_TAG = '__VGDMX__'
function writeSystemClipboard(payload: ClipboardPayload) {
  try { navigator.clipboard?.writeText(CLIP_TAG + JSON.stringify(payload)) } catch { /* egal */ }
}
async function readSystemClipboard(): Promise<ClipboardPayload | null> {
  try {
    const text = await navigator.clipboard?.readText()
    if (text && text.startsWith(CLIP_TAG)) return JSON.parse(text.slice(CLIP_TAG.length))
  } catch { /* egal */ }
  return null
}
