import React, { useState, useRef } from 'react'
import { useStore } from '../store'
import { allProfiles, uid, FUNC_LABELS, ALL_FUNCS } from '../util'
import { ChannelDef, FixtureProfile, FunctionType } from '../../../shared/types'

export default function LibraryPanel() {
  const project = useStore(s => s.project)
  const addCustomProfile = useStore(s => s.addCustomProfile)
  const importOflFiles = useStore(s => s.importOflFiles)
  const importGdtf = useStore(s => s.importGdtf)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(false)
  const oflInput = useRef<HTMLInputElement>(null)

  const profiles = allProfiles(project.customProfiles)
  const filtered = profiles.filter(p =>
    `${p.brand} ${p.name}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <h1 className="page-title">Fixture-Bibliothek</h1>
      <p className="page-sub">Generic-Lichter & Marken. Fehlt ein Modell? Eigenes Fixture anlegen.</p>

      <div className="toolbar">
        <input type="text" placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
        <div className="spacer" style={{ flex: 1 }} />
        <input ref={oflInput} type="file" accept=".json" multiple style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.length) importOflFiles(e.target.files); e.target.value = '' }} />
        <button className="btn" onClick={() => oflInput.current?.click()} title="Open Fixture Library JSON importieren">⬇ OFL-Import</button>
        <button className="btn" onClick={() => importGdtf()} title="GDTF-Datei importieren">⬇ GDTF-Import</button>
        <button className="btn primary" onClick={() => setEditing(true)}>+ Eigenes Fixture</button>
      </div>

      <div className="cards">
        {filtered.map(p => (
          <div className="card" key={p.id} style={{ cursor: 'default' }}>
            <div className="title">{p.name}</div>
            <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>{p.brand}</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
              {p.modes.map((m, i) => <span className="tag" key={i}>{m.channels.length}ch</span>)}
              {p.builtin ? <span className="tag">eingebaut</span> : <span className="tag" style={{ color: 'var(--accent)' }}>eigen</span>}
            </div>
          </div>
        ))}
      </div>

      {editing && <CustomFixtureEditor onClose={() => setEditing(false)} onSave={(p) => { addCustomProfile(p); setEditing(false) }} />}
    </div>
  )
}

function CustomFixtureEditor({ onClose, onSave }: { onClose: () => void; onSave: (p: FixtureProfile) => void }) {
  const [brand, setBrand] = useState('Custom')
  const [name, setName] = useState('Neues Fixture')
  const [channels, setChannels] = useState<ChannelDef[]>([{ function: 'dimmer', name: 'Dimmer' }])

  function setCh(i: number, patch: Partial<ChannelDef>) {
    setChannels(channels.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }
  function addCh() { setChannels([...channels, { function: 'unused', name: 'Kanal' }]) }
  function delCh(i: number) { setChannels(channels.filter((_, idx) => idx !== i)) }

  function save() {
    const prof: FixtureProfile = {
      id: uid('prof'), brand: brand || 'Custom', name: name || 'Fixture',
      modes: [{ name: `${channels.length}ch`, channels }]
    }
    onSave(prof)
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Eigenes Fixture anlegen</h3>
        <div className="row" style={{ marginBottom: 14 }}>
          <label className="field" style={{ flex: 1 }}>Hersteller
            <input type="text" value={brand} onChange={e => setBrand(e.target.value)} />
          </label>
          <label className="field" style={{ flex: 2 }}>Name
            <input type="text" value={name} onChange={e => setName(e.target.value)} />
          </label>
        </div>

        <div className="section-h">Kanaele ({channels.length})</div>
        <div className="col">
          {channels.map((c, i) => (
            <div className="row" key={i}>
              <span className="tag" style={{ width: 28, textAlign: 'center' }}>{i + 1}</span>
              <input type="text" value={c.name} onChange={e => setCh(i, { name: e.target.value })} style={{ flex: 1 }} />
              <select value={c.function} onChange={e => setCh(i, { function: e.target.value as FunctionType })}>
                {ALL_FUNCS.map(f => <option key={f} value={f}>{FUNC_LABELS[f]}</option>)}
              </select>
              <button className="btn sm del" onClick={() => delCh(i)}>×</button>
            </div>
          ))}
        </div>
        <button className="btn sm" style={{ marginTop: 10 }} onClick={addCh}>+ Kanal</button>

        <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn primary" onClick={save}>Speichern</button>
        </div>
      </div>
    </div>
  )
}
