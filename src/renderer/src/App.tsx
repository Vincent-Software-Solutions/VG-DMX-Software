import React, { useEffect, useState } from 'react'
import { useStore } from './store'
import { initMidi, setMidiHandler, MidiMessage } from './midi'
import StartScreen from './components/StartScreen'
import TopBar from './components/TopBar'
import PatchPanel from './components/PatchPanel'
import LibraryPanel from './components/LibraryPanel'
import LivePanel from './components/LivePanel'
import ChannelsPanel from './components/ChannelsPanel'
import StagePanel from './components/StagePanel'
import AutoShowPanel from './components/AutoShowPanel'
import ScenesPanel from './components/ScenesPanel'
import AnimationsPanel from './components/AnimationsPanel'
import ShowsPanel from './components/ShowsPanel'
import BoardPanel from './components/BoardPanel'
import SettingsPanel from './components/SettingsPanel'

type Page = 'live' | 'channels' | 'stage' | 'autoshow' | 'scenes' | 'animations' | 'shows' | 'board' | 'patch' | 'library' | 'settings'

const NAV: { id: Page; label: string; group?: boolean }[] = [
  { id: 'live', label: 'Live-Pult' },
  { id: 'channels', label: 'Kanaele (DMX)' },
  { id: 'stage', label: '2D-Buehne' },
  { id: 'autoshow', label: 'Auto-Show' },
  { id: 'scenes', label: 'Baenke & Szenen', group: true },
  { id: 'animations', label: 'Animationen' },
  { id: 'shows', label: 'Shows & Cues' },
  { id: 'board', label: 'Mein Board' },
  { id: 'patch', label: 'Patch', group: true },
  { id: 'library', label: 'Fixture-Bibliothek' },
  { id: 'settings', label: 'Einstellungen', group: true }
]

// MIDI -> Board-Widget-Aktion
function midiDispatch(m: MidiMessage) {
  const st = useStore.getState()
  const board = st.project.boards?.[0]
  if (!board) return
  for (const w of board.widgets) {
    if (!w.midi || w.midi.kind !== m.kind || w.midi.channel !== m.channel || w.midi.data1 !== m.data1) continue
    const b = w.binding
    if (w.kind === 'fader' && b.type === 'master') { st.control({ kind: 'master', value: m.value / 127 }); continue }
    if (m.value === 0) continue
    switch (b.type) {
      case 'scene': st.control({ kind: 'sceneToggle', id: b.sceneId }); break
      case 'animation': st.control({ kind: 'playAnimation', id: b.animationId }); break
      case 'blackout': st.control({ kind: 'blackout', value: !st.status.blackout }); break
      case 'fog': st.control({ kind: 'fog', value: !st.status.fog }); break
      case 'strobe': st.control({ kind: 'strobe', value: st.status.strobe > 0 ? 0 : 12 }); break
    }
  }
}

export default function App() {
  const init = useStore(s => s.init)
  const ready = useStore(s => s.ready)
  const screen = useStore(s => s.screen)
  const toast = useStore(s => s.toast)
  const selection = useStore(s => s.selection)
  const copyFixtures = useStore(s => s.copyFixtures)
  const paste = useStore(s => s.paste)
  const undo = useStore(s => s.undo)
  const redo = useStore(s => s.redo)
  const [page, setPage] = useState<Page>('live')

  useEffect(() => { void init() }, [init])
  useEffect(() => { void initMidi().then(ok => { if (ok) setMidiHandler(midiDispatch) }) }, [])

  // Globale Tastatur: Strg+C / Strg+V / Strg+Z / Strg+Y
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const k = e.key.toLowerCase()
      if (k === 'c') { if (selection.length) { copyFixtures(selection); e.preventDefault() } }
      else if (k === 'v') { paste(); e.preventDefault() }
      else if (k === 'z' && !e.shiftKey) { undo(); e.preventDefault() }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { redo(); e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection, copyFixtures, paste, undo, redo])

  if (!ready) return <div className="app"><div className="content"><p className="muted">Lade VG | DMX Software…</p></div></div>
  if (screen === 'start') return <StartScreen />

  return (
    <div className="app">
      <TopBar />
      <div className="body">
        <nav className="nav">
          {NAV.map(n => (
            <React.Fragment key={n.id}>
              {n.group && <div className="nav-sep" />}
              <button className={page === n.id ? 'active' : ''} onClick={() => setPage(n.id)}>{n.label}</button>
            </React.Fragment>
          ))}
        </nav>
        <main className="content">
          {page === 'live' && <LivePanel />}
          {page === 'channels' && <ChannelsPanel />}
          {page === 'stage' && <StagePanel />}
          {page === 'autoshow' && <AutoShowPanel />}
          {page === 'scenes' && <ScenesPanel />}
          {page === 'animations' && <AnimationsPanel />}
          {page === 'shows' && <ShowsPanel />}
          {page === 'board' && <BoardPanel />}
          {page === 'patch' && <PatchPanel />}
          {page === 'library' && <LibraryPanel />}
          {page === 'settings' && <SettingsPanel />}
        </main>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
