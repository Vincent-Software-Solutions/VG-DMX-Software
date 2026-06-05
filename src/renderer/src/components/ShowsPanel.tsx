import React, { useState } from 'react'
import { useStore } from '../store'
import { uid } from '../util'
import { Show, Cue } from '../../../shared/types'

export default function ShowsPanel() {
  const project = useStore(s => s.project)
  const control = useStore(s => s.control)
  const status = useStore(s => s.status)
  const saveShow = useStore(s => s.saveShow)
  const removeShow = useStore(s => s.removeShow)

  const [editId, setEditId] = useState<string | null>(null)
  const shows = project.shows || []

  function newShow() {
    const s: Show = { id: uid('show'), name: `Show ${shows.length + 1}`, cues: [], loop: false }
    saveShow(s); setEditId(s.id)
  }

  const editing = shows.find(s => s.id === editId)

  return (
    <div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Shows & Cues</h1>
          <p className="page-sub">Cue-Listen aus Szenen & Animationen. „Go" schaltet zur naechsten Cue, Auto-Follow laeuft automatisch weiter.</p>
        </div>
        <button className="btn primary" onClick={newShow}>+ Neue Show</button>
      </div>

      <div className="cards" style={{ marginBottom: 20 }}>
        {shows.map(sh => {
          const running = status.showId === sh.id
          const curCue = running ? sh.cues[status.cueIndex] : null
          return (
            <div className={'card' + (running ? ' on' : '')} key={sh.id}>
              <div className="title">{sh.name}</div>
              <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>
                {sh.cues.length} Cues {sh.loop ? '· Loop' : ''}{running ? ` · läuft (Cue ${status.cueIndex + 1}${curCue ? ': ' + curCue.name : ''})` : ''}
              </div>
              <div className="row">
                <button className="btn sm primary" onClick={() => control({ kind: 'showGo', id: sh.id })}>▶ Go</button>
                <button className="btn sm" onClick={() => control({ kind: 'showStop' })} disabled={!running}>■</button>
                <button className="btn sm" onClick={() => setEditId(sh.id)}>Bearbeiten</button>
                <button className="btn sm del" onClick={() => removeShow(sh.id)}>×</button>
              </div>
            </div>
          )
        })}
      </div>

      {editing && <ShowEditor show={editing} onClose={() => setEditId(null)} />}
    </div>
  )
}

function ShowEditor({ show, onClose }: { show: Show; onClose: () => void }) {
  const project = useStore(s => s.project)
  const saveShow = useStore(s => s.saveShow)
  const [name, setName] = useState(show.name)
  const [loop, setLoop] = useState(show.loop)
  const [cues, setCues] = useState<Cue[]>(show.cues)
  const [addType, setAddType] = useState<'scene' | 'animation' | 'blackout'>('scene')
  const [addRef, setAddRef] = useState(project.scenes[0]?.id ?? '')

  function commit(next: Partial<Show>) { saveShow({ ...show, name, loop, cues, ...next }) }
  function addCue() {
    let target: Cue['target']
    let nm = ''
    if (addType === 'scene') { if (!addRef) return; target = { type: 'scene', sceneId: addRef }; nm = project.scenes.find(s => s.id === addRef)?.name ?? 'Szene' }
    else if (addType === 'animation') { if (!addRef) return; target = { type: 'animation', animationId: addRef }; nm = project.animations.find(a => a.id === addRef)?.name ?? 'Animation' }
    else { target = { type: 'blackout' }; nm = 'Blackout' }
    const c: Cue = { id: uid('cue'), name: nm, target, fade: 1, follow: 'go', autoWait: 3 }
    const nc = [...cues, c]; setCues(nc); saveShow({ ...show, name, loop, cues: nc })
  }
  function upd(i: number, patch: Partial<Cue>) { const nc = cues.map((c, idx) => idx === i ? { ...c, ...patch } : c); setCues(nc); saveShow({ ...show, name, loop, cues: nc }) }
  function del(i: number) { const nc = cues.filter((_, idx) => idx !== i); setCues(nc); saveShow({ ...show, name, loop, cues: nc }) }
  function move(i: number, d: -1 | 1) { const j = i + d; if (j < 0 || j >= cues.length) return; const nc = [...cues];[nc[i], nc[j]] = [nc[j], nc[i]]; setCues(nc); saveShow({ ...show, name, loop, cues: nc }) }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 720 }}>
        <h3>Show bearbeiten</h3>
        <div className="row" style={{ marginBottom: 14 }}>
          <label className="field" style={{ flex: 1 }}>Name
            <input type="text" value={name} onChange={e => setName(e.target.value)} onBlur={() => commit({})} />
          </label>
          <button className={'btn' + (loop ? ' primary' : '')} style={{ alignSelf: 'flex-end' }}
            onClick={() => { setLoop(!loop); saveShow({ ...show, name, loop: !loop, cues }) }}>{loop ? '🔁 Loop' : 'Loop aus'}</button>
        </div>

        <div className="section-h">Cues</div>
        {cues.length === 0 && <div className="empty">Noch keine Cues.</div>}
        <div className="col">
          {cues.map((c, i) => (
            <div className="row" key={c.id} style={{ background: 'var(--bg-3)', padding: 8, borderRadius: 8, flexWrap: 'wrap' }}>
              <span className="tag" style={{ width: 24, textAlign: 'center' }}>{i + 1}</span>
              <input type="text" value={c.name} onChange={e => upd(i, { name: e.target.value })} style={{ width: 130 }} />
              <span className="tag">{c.target.type}</span>
              <label className="field" style={{ width: 70 }}>Fade s
                <input type="number" min={0} step={0.1} value={c.fade} onChange={e => upd(i, { fade: Number(e.target.value) })} />
              </label>
              <select value={c.follow} onChange={e => upd(i, { follow: e.target.value as 'go' | 'auto' })}>
                <option value="go">Go (manuell)</option>
                <option value="auto">Auto-Follow</option>
              </select>
              {c.follow === 'auto' && (
                <label className="field" style={{ width: 80 }}>Warten s
                  <input type="number" min={0} step={0.1} value={c.autoWait} onChange={e => upd(i, { autoWait: Number(e.target.value) })} />
                </label>
              )}
              <button className="btn sm" onClick={() => move(i, -1)}>↑</button>
              <button className="btn sm" onClick={() => move(i, 1)}>↓</button>
              <button className="btn sm del" onClick={() => del(i)}>×</button>
            </div>
          ))}
        </div>

        <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <select value={addType} onChange={e => { const t = e.target.value as any; setAddType(t); setAddRef(t === 'animation' ? (project.animations[0]?.id ?? '') : (project.scenes[0]?.id ?? '')) }}>
            <option value="scene">Szene</option>
            <option value="animation">Animation</option>
            <option value="blackout">Blackout</option>
          </select>
          {addType !== 'blackout' && (
            <select value={addRef} onChange={e => setAddRef(e.target.value)} style={{ flex: 1, minWidth: 160 }}>
              {(addType === 'scene' ? project.scenes : project.animations).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          )}
          <button className="btn" onClick={addCue}>+ Cue hinzufuegen</button>
        </div>

        <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="btn primary" onClick={onClose}>Fertig</button>
        </div>
      </div>
    </div>
  )
}
