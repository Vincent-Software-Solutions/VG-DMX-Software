import React, { useState } from 'react'
import { useStore } from '../store'

export default function StartScreen() {
  const projects = useStore(s => s.projects)
  const createProject = useStore(s => s.createProject)
  const openProject = useStore(s => s.openProject)
  const renameProject = useStore(s => s.renameProject)
  const deleteProject = useStore(s => s.deleteProject)
  const duplicateProject = useStore(s => s.duplicateProject)
  const importEvent = useStore(s => s.importEvent)
  const exportActive = useStore(s => s.exportActive)
  const openProjectThen = async (id: string, fn: () => void) => { await openProject(id); fn() }

  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [tmp, setTmp] = useState('')

  function create() {
    const n = name.trim() || 'Neues Event'
    createProject(n); setName('')
  }

  return (
    <div className="start">
      <div className="start-head">
        <div className="start-brand">VG <span>|</span> DMX Software</div>
        <div className="start-sub">Lichtsteuerung — waehle ein Event oder erstelle ein neues.</div>
      </div>

      <div className="start-new">
        <input type="text" placeholder="Name des neuen Events…" value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} />
        <button className="btn primary" onClick={create}>+ Event erstellen</button>
        <button className="btn" onClick={() => importEvent()}>⬆ Event importieren</button>
      </div>

      <div className="start-grid">
        {projects.length === 0 && <div className="empty">Noch keine Events.</div>}
        {[...projects].sort((a, b) => b.updatedAt - a.updatedAt).map(p => (
          <div className="event-card" key={p.id} onDoubleClick={() => openProject(p.id)}>
            {renaming === p.id ? (
              <input autoFocus type="text" value={tmp} onChange={e => setTmp(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { renameProject(p.id, tmp || p.name); setRenaming(null) } }}
                onBlur={() => { renameProject(p.id, tmp || p.name); setRenaming(null) }} />
            ) : (
              <div className="event-name">{p.name}</div>
            )}
            <div className="event-meta">Zuletzt geaendert: {new Date(p.updatedAt).toLocaleString('de-DE')}</div>
            <div className="event-actions">
              <button className="btn primary sm" onClick={() => openProject(p.id)}>Oeffnen</button>
              <button className="btn sm" onClick={() => { setRenaming(p.id); setTmp(p.name) }}>Umbenennen</button>
              <button className="btn sm" onClick={() => duplicateProject(p.id)}>Duplizieren</button>
              <button className="btn sm" onClick={() => exportById(p.id)}>Export</button>
              <button className="btn sm del" onClick={() => { if (confirm(`Event "${p.name}" wirklich loeschen?`)) deleteProject(p.id) }}>Loeschen</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
