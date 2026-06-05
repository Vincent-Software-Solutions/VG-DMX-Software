import React, { useRef, useState, useEffect } from 'react'
import { useStore } from '../store'
import { findProfile, fixtureColor } from '../util'

// 2D-Buehne: Lampen platzieren & verschieben. Position speist die Auto-Shows.
export default function StagePanel() {
  const project = useStore(s => s.project)
  const frame = useStore(s => s.frame)
  const patchProject = useStore(s => s.patchProject)
  const selection = useStore(s => s.selection)
  const toggleSelect = useStore(s => s.toggleSelect)
  const setSelection = useStore(s => s.setSelection)

  const boxRef = useRef<HTMLDivElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragXY, setDragXY] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ id: string; x: number; y: number } | null>(null)

  const placed = project.fixtures.filter(f => typeof f.x === 'number' && typeof f.y === 'number')
  const unplaced = project.fixtures.filter(f => typeof f.x !== 'number' || typeof f.y !== 'number')

  // Listener pro Drag-Vorgang nur EINMAL registrieren (Dependency: dragId, nicht das Live-Objekt).
  useEffect(() => {
    if (!dragId) return
    function move(e: PointerEvent) {
      const box = boxRef.current?.getBoundingClientRect()
      if (!box) return
      const x = Math.max(0, Math.min(1000, ((e.clientX - box.left) / box.width) * 1000))
      const y = Math.max(0, Math.min(1000, ((e.clientY - box.top) / box.height) * 1000))
      dragRef.current = { id: dragId!, x, y }
      setDragXY({ x, y })
    }
    function up() {
      const d = dragRef.current
      if (d) patchProject(p => { const fx = p.fixtures.find(f => f.id === d.id); if (fx) { fx.x = Math.round(d.x); fx.y = Math.round(d.y) } })
      dragRef.current = null
      setDragId(null); setDragXY(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [dragId, patchProject])

  function startDrag(e: React.PointerEvent, id: string, x: number, y: number) {
    e.preventDefault()
    if (!selection.includes(id)) setSelection([id])
    dragRef.current = { id, x, y }
    setDragId(id); setDragXY({ x, y })
  }
  function place(id: string) {
    patchProject(p => {
      const n = p.fixtures.filter(f => typeof f.x === 'number' && typeof f.y === 'number').length
      const fx = p.fixtures.find(f => f.id === id)
      if (fx) { fx.x = 200 + (n % 5) * 140; fx.y = 300 + Math.floor(n / 5) * 140 }
    })
  }
  function unplace(id: string) {
    patchProject(p => { const fx = p.fixtures.find(f => f.id === id); if (fx) { fx.x = undefined; fx.y = undefined } })
  }
  function autoArrange() {
    patchProject(p => {
      const n = p.fixtures.length
      p.fixtures.forEach((fx, i) => { fx.x = Math.round(((i + 0.5) / n) * 900 + 50); fx.y = 250 })
    })
  }

  return (
    <div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">2D-Buehne</h1>
          <p className="page-sub">Lampen platzieren & verschieben. Die Positionen steuern die automatischen Shows (Auto-Show).</p>
        </div>
        <button className="btn sm" onClick={autoArrange} disabled={project.fixtures.length === 0}>Auto-Anordnen (Reihe)</button>
      </div>

      {unplaced.length > 0 && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Noch nicht platziert — anklicken zum Hinzufuegen:</div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {unplaced.map(fx => <button className="btn sm" key={fx.id} onClick={() => place(fx.id)}>+ {fx.name}</button>)}
          </div>
        </div>
      )}

      <div className="stage" ref={boxRef} onClick={e => { if (e.target === boxRef.current) setSelection([]) }}>
        {placed.map(fx => {
          const live = dragId === fx.id && dragXY ? dragXY : { x: fx.x!, y: fx.y! }
          const prof = findProfile(project.customProfiles, fx.profileId)
          const isMoving = prof?.modes[fx.modeIndex]?.channels.some(c => c.function === 'pan')
          const color = fixtureColor(fx, project.customProfiles, frame)
          const sel = selection.includes(fx.id)
          return (
            <div key={fx.id}
              className={'stage-node' + (sel ? ' sel' : '') + (isMoving ? ' moving' : '')}
              style={{ left: `${live.x / 10}%`, top: `${live.y / 10}%` }}
              onPointerDown={e => startDrag(e, fx.id, live.x, live.y)}
              onClick={e => { e.stopPropagation(); if (e.shiftKey) toggleSelect(fx.id); else setSelection([fx.id]) }}
              onDoubleClick={e => { e.stopPropagation(); unplace(fx.id) }}
              title={`${fx.name} — Doppelklick: von Buehne entfernen`}
            >
              <div className="stage-dot" style={{ background: color, boxShadow: `0 0 14px ${color}` }} />
              <div className="stage-label">{fx.name}</div>
            </div>
          )
        })}
        {placed.length === 0 && <div className="stage-hint">Lampen hier platzieren (oben hinzufuegen). Ziehen zum Verschieben, Doppelklick entfernt.</div>}
      </div>
    </div>
  )
}
