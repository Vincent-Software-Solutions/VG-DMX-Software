import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { uid } from '../util'
import { learnNext, cancelLearn, midiAvailable } from '../midi'
import { Board, BoardWidget, BindingType, WidgetKind } from '../../../shared/types'

const W = 150, H = 96, GAP = 12
const fallbackPos = (i: number) => ({ x: GAP + (i % 6) * (W + GAP), y: GAP + Math.floor(i / 6) * (H + GAP) })

export default function BoardPanel() {
  const project = useStore(s => s.project)
  const control = useStore(s => s.control)
  const saveBoard = useStore(s => s.saveBoard)
  const status = useStore(s => s.status)

  const board = project.boards[0]
  const [editMode, setEditMode] = useState(false)
  const [adding, setAdding] = useState(false)
  const [active, setActive] = useState<Set<string>>(new Set())
  const canvasRef = useRef<HTMLDivElement>(null)

  const [learning, setLearning] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragXY, setDragXY] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ id: string; x: number; y: number; offX: number; offY: number } | null>(null)

  useEffect(() => {
    if (!dragId) return
    function move(e: PointerEvent) {
      const box = canvasRef.current?.getBoundingClientRect()
      const d = dragRef.current
      if (!box || !d) return
      const x = Math.min(box.width - W, Math.max(0, e.clientX - box.left - d.offX))
      const y = Math.min(Math.max(0, box.height - H), Math.max(0, e.clientY - box.top - d.offY))
      d.x = x; d.y = y
      setDragXY({ x, y })
    }
    function up() {
      const d = dragRef.current
      if (d) saveBoard({ ...board, widgets: board.widgets.map(w => w.id === d.id ? { ...w, x: Math.round(d.x), y: Math.round(d.y) } : w) })
      dragRef.current = null
      setDragId(null); setDragXY(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [dragId, board])

  useEffect(() => { if (!editMode) { cancelLearn(); setLearning(null) } }, [editMode])
  useEffect(() => () => cancelLearn(), []) // beim Verlassen der Seite Learn abbrechen

  function startDrag(e: React.PointerEvent, w: BoardWidget, i: number) {
    if (!editMode) return
    e.preventDefault()
    const box = canvasRef.current?.getBoundingClientRect()
    const fb = fallbackPos(i)
    const px = w.x ?? fb.x, py = w.y ?? fb.y
    const offX = box ? e.clientX - box.left - px : W / 2
    const offY = box ? e.clientY - box.top - py : 16
    dragRef.current = { id: w.id, x: px, y: py, offX, offY }
    setDragId(w.id); setDragXY({ x: px, y: py })
  }

  function trigger(w: BoardWidget) {
    const b = w.binding
    switch (b.type) {
      case 'scene': control({ kind: 'sceneToggle', id: b.sceneId }); flip(w.id); break
      case 'animation': {
        const on = active.has(w.id)
        control(on ? { kind: 'stopAnimation' } : { kind: 'playAnimation', id: b.animationId }); flip(w.id); break
      }
      case 'blackout': control({ kind: 'blackout', value: !status.blackout }); break
      case 'fog': control({ kind: 'fog', value: !status.fog }); break
      case 'strobe': control({ kind: 'strobe', value: status.strobe > 0 ? 0 : 12 }); break
    }
  }
  function flip(id: string) { setActive(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function fader(w: BoardWidget, v: number) { if (w.binding.type === 'master') control({ kind: 'master', value: v / 100 }) }
  function removeWidget(id: string) { saveBoard({ ...board, widgets: board.widgets.filter(w => w.id !== id) }) }
  function learnMidi(w: BoardWidget) {
    setLearning(w.id)
    learnNext(m => {
      const cur = useStore.getState().project.boards[0] // aktuellen Stand lesen (nicht stale closure)
      if (!cur) { setLearning(null); return }
      saveBoard({ ...cur, widgets: cur.widgets.map(x => x.id === w.id ? { ...x, midi: { kind: m.kind, channel: m.channel, data1: m.data1 } } : x) })
      setLearning(null)
    })
  }
  function clearMidi(w: BoardWidget) { saveBoard({ ...board, widgets: board.widgets.map(x => x.id === w.id ? { ...x, midi: undefined } : x) }) }
  function isActive(w: BoardWidget) {
    if (w.binding.type === 'blackout') return status.blackout
    if (w.binding.type === 'fog') return status.fog
    if (w.binding.type === 'strobe') return status.strobe > 0
    return active.has(w.id)
  }

  return (
    <div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Mein Board</h1>
          <p className="page-sub">Eigenes Pult: Buttons & Fader frei platzieren (im Bearbeiten-Modus ziehen) und mit Aktionen verknuepfen.</p>
        </div>
        <button className={'btn' + (editMode ? ' primary' : '')} onClick={() => setEditMode(!editMode)}>{editMode ? '✓ Fertig' : '✎ Bearbeiten'}</button>
        {editMode && <button className="btn" onClick={() => setAdding(true)}>+ Widget</button>}
      </div>

      <div className={'board-canvas' + (editMode ? ' edit' : '')} ref={canvasRef}>
        {board.widgets.length === 0 && <div className="stage-hint">Leeres Board — „Bearbeiten" → „+ Widget".</div>}
        {board.widgets.map((w, i) => {
          const fb = fallbackPos(i)
          const pos = dragId === w.id && dragXY ? dragXY : { x: w.x ?? fb.x, y: w.y ?? fb.y }
          return (
            <div key={w.id} className={'widget' + (isActive(w) ? ' on' : '') + (editMode ? ' draggable' : '')}
              style={{ left: pos.x, top: pos.y, width: W, height: H }}
              onPointerDown={e => startDrag(e, w, i)}>
              {editMode && <div className="widget-x" onClick={() => removeWidget(w.id)}>×</div>}
              <div className="widget-label">{w.label}</div>
              {w.kind === 'button' ? (
                <button className={'btn sm' + (isActive(w) ? ' primary' : '')} style={{ width: '100%' }}
                  onClick={() => !editMode && trigger(w)}>{isActive(w) ? 'AN' : 'Ausloesen'}</button>
              ) : (
                <input type="range" min={0} max={100} value={Math.round(status.master * 100)} style={{ width: '100%' }}
                  onPointerDown={e => e.stopPropagation()} onChange={e => fader(w, Number(e.target.value))} />
              )}
              {editMode && (
                <div className="widget-midi" onPointerDown={e => e.stopPropagation()}>
                  {learning === w.id ? <span className="muted">MIDI lernen… (Taste/Regler druecken)</span>
                    : w.midi ? <span className="tag">{w.midi.kind} {w.midi.channel + 1}/{w.midi.data1} <span style={{ cursor: 'pointer', color: 'var(--bad)' }} onClick={() => clearMidi(w)}>×</span></span>
                      : <button className="btn sm" disabled={!midiAvailable()} onClick={() => learnMidi(w)} title={midiAvailable() ? 'MIDI zuweisen' : 'Kein MIDI-Geraet'}>MIDI</button>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {adding && <AddWidget board={board} onClose={() => setAdding(false)} onSave={(b) => { saveBoard(b); setAdding(false) }} />}
    </div>
  )
}

function AddWidget({ board, onClose, onSave }: { board: Board; onClose: () => void; onSave: (b: Board) => void }) {
  const project = useStore(s => s.project)
  const [target, setTarget] = useState('scene')
  const [refId, setRefId] = useState(project.scenes[0]?.id ?? '')
  const [label, setLabel] = useState('')

  function build(): BoardWidget | null {
    let binding: BindingType, kind: WidgetKind = 'button', auto = ''
    switch (target) {
      case 'scene': if (!refId) return null; binding = { type: 'scene', sceneId: refId }; auto = project.scenes.find(s => s.id === refId)?.name ?? 'Szene'; break
      case 'animation': if (!refId) return null; binding = { type: 'animation', animationId: refId }; auto = project.animations.find(a => a.id === refId)?.name ?? 'Animation'; break
      case 'master': binding = { type: 'master' }; kind = 'fader'; auto = 'Master'; break
      case 'blackout': binding = { type: 'blackout' }; auto = 'Blackout'; break
      case 'fog': binding = { type: 'fog' }; auto = 'Fog'; break
      case 'strobe': binding = { type: 'strobe' }; auto = 'Strobe'; break
      default: return null
    }
    const pos = fallbackPos(board.widgets.length)
    return { id: uid('w'), kind, label: label || auto, binding, x: pos.x, y: pos.y }
  }
  function save() { const w = build(); if (w) onSave({ ...board, widgets: [...board.widgets, w] }) }
  const needsRef = target === 'scene' || target === 'animation'

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Widget hinzufuegen</h3>
        <label className="field" style={{ marginBottom: 12 }}>Aktion
          <select value={target} onChange={e => { setTarget(e.target.value); setRefId(e.target.value === 'animation' ? (project.animations[0]?.id ?? '') : (project.scenes[0]?.id ?? '')) }}>
            <option value="scene">Szene ausloesen</option>
            <option value="animation">Animation ausloesen</option>
            <option value="master">Master-Dimmer (Fader)</option>
            <option value="blackout">Blackout</option>
            <option value="fog">Fog</option>
            <option value="strobe">Strobe</option>
          </select>
        </label>
        {needsRef && (
          <label className="field" style={{ marginBottom: 12 }}>Ziel
            <select value={refId} onChange={e => setRefId(e.target.value)}>
              {(target === 'scene' ? project.scenes : project.animations).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
        )}
        <label className="field" style={{ marginBottom: 12 }}>Beschriftung (optional)
          <input type="text" value={label} onChange={e => setLabel(e.target.value)} />
        </label>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn primary" onClick={save}>Hinzufuegen</button>
        </div>
      </div>
    </div>
  )
}
