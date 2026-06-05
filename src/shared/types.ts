// Geteilte Typen zwischen Main-Prozess (DMX-Engine) und Renderer (UI)

export type FunctionType =
  | 'dimmer' | 'red' | 'green' | 'blue' | 'white' | 'amber' | 'uv'
  | 'pan' | 'panFine' | 'tilt' | 'tiltFine' | 'speed'
  | 'shutter' | 'strobe' | 'gobo' | 'color' | 'focus' | 'fog' | 'macro' | 'unused'

export const INTENSITY_FUNCS: FunctionType[] = ['dimmer', 'red', 'green', 'blue', 'white', 'amber', 'uv']
export const isIntensityFunc = (f: FunctionType) => INTENSITY_FUNCS.includes(f)

export interface ChannelDef {
  function: FunctionType
  name: string
  default?: number
}

export interface FixtureMode {
  name: string
  channels: ChannelDef[]
}

export interface FixtureProfile {
  id: string
  brand: string
  name: string
  modes: FixtureMode[]
  builtin?: boolean
}

export interface PatchedFixture {
  id: string
  profileId: string
  modeIndex: number
  universe: number
  address: number      // 1-basiert (DMX-Startadresse)
  name: string
  group?: string
  x?: number           // Position auf der 2D-Buehne (0..1000)
  y?: number
  rotation?: number    // Ausrichtung in Grad (fuer Moving Heads / Symmetrie)
}

// fixtureId -> (Funktion -> Wert 0..255)
export type SceneValues = Record<string, Partial<Record<FunctionType, number>>>

export interface Scene {
  id: string
  name: string
  bankId: string
  values: SceneValues
  fadeIn: number       // Sekunden
  color?: string
}

export type StepTransition = 'sofort' | 'fade'

export interface AnimationStep {
  sceneId: string
  transition: StepTransition
  fadeTime: number     // Sekunden (nur bei 'fade')
  holdTime: number     // Sekunden warten
}

export interface Animation {
  id: string
  name: string
  bankId: string
  steps: AnimationStep[]
  loop: boolean
  color?: string
}

export interface Bank {
  id: string
  name: string
}

export type WidgetKind = 'button' | 'fader'

export type BindingType =
  | { type: 'scene'; sceneId: string }
  | { type: 'animation'; animationId: string }
  | { type: 'master' }
  | { type: 'blackout' }
  | { type: 'fog' }
  | { type: 'strobe' }

export interface MidiMapping {
  kind: 'note' | 'cc'
  channel: number   // 0..15
  data1: number     // Note-Nummer oder CC-Nummer
}

export interface BoardWidget {
  id: string
  kind: WidgetKind
  label: string
  binding: BindingType
  color?: string
  x?: number       // freie Platzierung auf dem Board (px)
  y?: number
  w?: number
  h?: number
  midi?: MidiMapping
}

// ---- Shows / Cue-Listen ----
export interface Cue {
  id: string
  name: string
  target: { type: 'scene'; sceneId: string } | { type: 'animation'; animationId: string } | { type: 'blackout' }
  fade: number          // Sekunden Cross-Fade
  follow: 'go' | 'auto' // 'go' = manuell, 'auto' = automatisch weiter
  autoWait: number      // Sekunden warten bei 'auto' (nach dem Fade)
}

export interface Show {
  id: string
  name: string
  cues: Cue[]
  loop: boolean
}

export interface Board {
  id: string
  name: string
  widgets: BoardWidget[]
}

export interface Project {
  fixtures: PatchedFixture[]
  customProfiles: FixtureProfile[]
  banks: Bank[]
  scenes: Scene[]
  animations: Animation[]
  boards: Board[]
  shows: Show[]
}

// ---- Mehrere Events/Projekte ----
export interface StoredProject extends Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}
export interface ProjectMeta { id: string; name: string; updatedAt: number }
export interface Workspace { activeId: string | null; projects: StoredProject[] }

// Zwischenablage (innerhalb der App / zwischen Projekten)
export type ClipboardPayload =
  | { type: 'fixtures'; fixtures: PatchedFixture[]; profiles: FixtureProfile[] }
  | { type: 'scenes'; scenes: Scene[] }
  | { type: 'widgets'; widgets: BoardWidget[] }

export function emptyProject(): Project {
  return {
    fixtures: [],
    customProfiles: [],
    banks: [{ id: 'bank-1', name: 'Bank 1' }],
    scenes: [],
    animations: [],
    boards: [{ id: 'board-1', name: 'Mein Board', widgets: [] }],
    shows: []
  }
}

// ---- Auto-Show (positions-/typ-/symmetriebasierte Effekte) ----

export type AutoEffect =
  | 'sweep' | 'wave' | 'chase' | 'rainbow' | 'symmetry' | 'circle' | 'pulse' | 'strobe' | 'auto'

export const AUTO_EFFECTS: { id: AutoEffect; label: string; desc: string }[] = [
  { id: 'auto', label: 'Auto-Mix', desc: 'Wechselt automatisch durch die Effekte (auf den Beat)' },
  { id: 'wave', label: 'Welle', desc: 'Helligkeits-Sinus laeuft ueber die Positionen' },
  { id: 'sweep', label: 'Sweep', desc: 'Heller Balken wandert links -> rechts' },
  { id: 'chase', label: 'Lauflicht', desc: 'Lampe fuer Lampe nach Position' },
  { id: 'rainbow', label: 'Regenbogen', desc: 'Farbverlauf ueber die Breite' },
  { id: 'symmetry', label: 'Symmetrie', desc: 'Gespiegelt um die Mitte' },
  { id: 'circle', label: 'Kreis (Moving Heads)', desc: 'Pan/Tilt-Kreise, Beams als Welle' },
  { id: 'pulse', label: 'Puls', desc: 'Alles pulsiert auf den Beat' },
  { id: 'strobe', label: 'Strobe-Beat', desc: 'Blitzt im Takt' }
]

export interface AutoShowConfig {
  effect: AutoEffect
  bpm: number          // beats per minute
  energy: number       // 0..1 (Tempo/Intensitaet)
  palette: string[]    // Hex-Farben
  groups: string[]     // Gruppen-Namen, leer = alle
  movingHeads: boolean // Pan/Tilt-Bewegung fuer Moving Heads aktiv
}

export interface EngineStatus {
  connected: boolean
  mode: 'sim' | 'serial'
  port?: string
  master: number
  blackout: boolean
  fog: boolean
  strobe: number
  autoShow: boolean
  showId: string | null
  cueIndex: number
}

// Steuer-Aktionen Renderer -> Engine
export type ControlAction =
  | { kind: 'sceneToggle'; id: string }
  | { kind: 'scenesOff' }
  | { kind: 'playAnimation'; id: string }
  | { kind: 'stopAnimation' }
  | { kind: 'live'; fixtureIds: string[]; func: FunctionType; value: number | null }
  | { kind: 'clearLive' }
  | { kind: 'master'; value: number }
  | { kind: 'blackout'; value: boolean }
  | { kind: 'fog'; value: boolean }
  | { kind: 'strobe'; value: number }
  | { kind: 'autoShow'; config: AutoShowConfig | null }
  | { kind: 'liveChannel'; universe: number; channel: number; value: number | null } // roher Kanal (1-basiert)
  | { kind: 'clearLiveChannels' }
  | { kind: 'showGo'; id: string }       // naechste Cue / Show starten
  | { kind: 'showStop' }
