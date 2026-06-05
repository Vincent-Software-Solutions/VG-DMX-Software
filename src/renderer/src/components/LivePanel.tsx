import React, { useState } from 'react'
import { useStore } from '../store'
import { findProfile, hex2rgb } from '../util'
import DmxMonitor from './DmxMonitor'
import { FunctionType } from '../../../shared/types'

const SWATCHES = ['#ff0000', '#ff7a00', '#ffd400', '#00ff44', '#00d0ff', '#0044ff', '#9900ff', '#ff00aa', '#ffffff', '#ff8888']

export default function LivePanel() {
  const project = useStore(s => s.project)
  const selection = useStore(s => s.selection)
  const toggleSelect = useStore(s => s.toggleSelect)
  const setSelection = useStore(s => s.setSelection)
  const setLive = useStore(s => s.setLive)
  const setColor = useStore(s => s.setColor)
  const control = useStore(s => s.control)
  const recordScene = useStore(s => s.recordScene)
  const notify = useStore(s => s.notify)

  const [recName, setRecName] = useState('')
  const bankId = project.banks[0]?.id

  // Gruppen ableiten
  const groups = Array.from(new Set(project.fixtures.map(f => f.group).filter(Boolean))) as string[]

  function selectGroup(g: string) {
    setSelection(project.fixtures.filter(f => f.group === g).map(f => f.id))
  }

  function applyFader(func: FunctionType, value: number) { setLive(func, value) }

  function record() {
    if (!bankId) { notify('Lege zuerst eine Bank an'); return }
    recordScene(bankId, recName || `Szene ${project.scenes.length + 1}`)
    setRecName('')
  }

  return (
    <div>
      <h1 className="page-title">Live-Pult</h1>
      <p className="page-sub">Fixtures auswaehlen und direkt steuern — ganz ohne Szene. Dann optional als Szene aufnehmen.</p>

      {project.fixtures.length === 0 ? (
        <div className="empty">Noch keine Fixtures. Gehe zu <b>Patch</b> und lege welche an.</div>
      ) : (
        <>
          <div className="toolbar">
            <button className="btn sm" onClick={() => setSelection(project.fixtures.map(f => f.id))}>Alle</button>
            <button className="btn sm" onClick={() => setSelection([])}>Keine</button>
            {groups.map(g => <button className="btn sm" key={g} onClick={() => selectGroup(g)}>{g}</button>)}
            <div style={{ flex: 1 }} />
            <button className="btn sm del" onClick={() => control({ kind: 'clearLive' })}>Live zuruecksetzen</button>
          </div>

          <div className="cards" style={{ marginBottom: 18 }}>
            {project.fixtures.map(fx => {
              const prof = findProfile(project.customProfiles, fx.profileId)
              const on = selection.includes(fx.id)
              return (
                <div className={'card' + (on ? ' on' : '')} key={fx.id} onClick={() => toggleSelect(fx.id)}>
                  <div className="title">{fx.name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{prof?.name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>U{fx.universe} · @{fx.address}</div>
                </div>
              )
            })}
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div className="panel col">
              <div className="section-h" style={{ margin: 0 }}>Farbe</div>
              <div className="swatches">
                {SWATCHES.map(c => (
                  <div className="swatch" key={c} style={{ background: c }}
                    onClick={() => { const { r, g, b } = hex2rgb(c); setColor(r, g, b) }} />
                ))}
              </div>
              <label className="field">Farbwaehler
                <input type="color" onChange={e => { const { r, g, b } = hex2rgb(e.target.value); setColor(r, g, b) }}
                  style={{ width: 60, height: 32, background: 'none', border: 'none' }} />
              </label>
              <Fader label="Dimmer" onChange={v => applyFader('dimmer', v)} />
            </div>

            <div className="panel col">
              <div className="section-h" style={{ margin: 0 }}>Bewegung (Moving Head)</div>
              <Fader label="Pan" onChange={v => applyFader('pan', v)} />
              <Fader label="Tilt" onChange={v => applyFader('tilt', v)} />
              <Fader label="Speed" onChange={v => applyFader('speed', v)} />
            </div>
          </div>

          <div className="panel" style={{ marginTop: 18 }}>
            <div className="row">
              <div className="section-h" style={{ margin: 0, flex: 1 }}>Aktuellen Look als Szene aufnehmen</div>
              <input type="text" placeholder="Szenen-Name" value={recName} onChange={e => setRecName(e.target.value)} style={{ width: 200 }} />
              <button className="btn primary" onClick={record}>● Aufnehmen</button>
            </div>
          </div>

          <div className="section-h">DMX-Ausgang (Universe 0, Kanal 1–128)</div>
          <DmxMonitor count={128} />
        </>
      )}
    </div>
  )
}

function Fader({ label, onChange }: { label: string; onChange: (v: number) => void }) {
  const [val, setVal] = useState(0)
  return (
    <label className="field">{label}: {val}
      <input type="range" min={0} max={255} value={val}
        onChange={e => { const v = Number(e.target.value); setVal(v); onChange(v) }} />
    </label>
  )
}
