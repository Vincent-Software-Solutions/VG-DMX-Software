import React, { useState } from 'react'
import { useStore } from '../store'

export default function ScenesPanel() {
  const project = useStore(s => s.project)
  const control = useStore(s => s.control)
  const addBank = useStore(s => s.addBank)
  const removeScene = useStore(s => s.removeScene)
  const recordScene = useStore(s => s.recordScene)
  const notify = useStore(s => s.notify)

  const [active, setActive] = useState<Set<string>>(new Set())
  const [newBank, setNewBank] = useState('')

  function toggle(id: string) {
    control({ kind: 'sceneToggle', id })
    setActive(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function allOff() {
    control({ kind: 'scenesOff' })
    setActive(new Set())
  }

  return (
    <div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Baenke & Szenen</h1>
          <p className="page-sub">Szenen sind statische Looks, organisiert in Baenken. Klick = an/aus (mehrere kombinierbar, HTP).</p>
        </div>
        <button className="btn sm del" onClick={allOff}>Alle Szenen aus</button>
      </div>

      <div className="toolbar">
        <input type="text" placeholder="Neue Bank…" value={newBank} onChange={e => setNewBank(e.target.value)} style={{ width: 220 }} />
        <button className="btn" onClick={() => { if (newBank.trim()) { addBank(newBank.trim()); setNewBank('') } }}>+ Bank</button>
      </div>

      {project.banks.map(bank => {
        const scenes = project.scenes.filter(s => s.bankId === bank.id)
        return (
          <div key={bank.id} style={{ marginBottom: 20 }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <div className="section-h" style={{ margin: 0 }}>{bank.name}</div>
              <span className="tag">{scenes.length} Szenen</span>
              <button className="btn sm ghost" onClick={() => {
                const name = `Szene ${project.scenes.length + 1}`
                recordScene(bank.id, name)
              }}>● Look aufnehmen</button>
            </div>
            {scenes.length === 0 ? (
              <div className="empty">Leere Bank — nimm im Live-Pult einen Look auf.</div>
            ) : (
              <div className="cards">
                {scenes.map(sc => (
                  <div className={'card' + (active.has(sc.id) ? ' on' : '')} key={sc.id} onClick={() => toggle(sc.id)}>
                    <div className="colorbar" style={sc.color ? { background: sc.color } : undefined} />
                    <div className="title">{sc.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{Object.keys(sc.values).length} Fixtures</div>
                    <div className="card-x" onClick={e => { e.stopPropagation(); removeScene(sc.id) }}>loeschen</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
