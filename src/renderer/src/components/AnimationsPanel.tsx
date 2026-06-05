import React, { useState } from 'react'
import { useStore } from '../store'
import { uid } from '../util'
import { Animation, AnimationStep, StepTransition } from '../../../shared/types'

export default function AnimationsPanel() {
  const project = useStore(s => s.project)
  const control = useStore(s => s.control)
  const saveAnimation = useStore(s => s.saveAnimation)
  const removeAnimation = useStore(s => s.removeAnimation)
  const notify = useStore(s => s.notify)

  const [editId, setEditId] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)

  function newAnimation() {
    const bankId = project.banks[0]?.id ?? 'bank-1'
    const a: Animation = { id: uid('anim'), name: `Animation ${project.animations.length + 1}`, bankId, steps: [], loop: true }
    saveAnimation(a)
    setEditId(a.id)
  }

  function play(id: string) {
    if (playing === id) { control({ kind: 'stopAnimation' }); setPlaying(null) }
    else { control({ kind: 'playAnimation', id }); setPlaying(id) }
  }

  const editing = project.animations.find(a => a.id === editId)

  return (
    <div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Animationen</h1>
          <p className="page-sub">Szenen mit Abstand & sofort/fade verketten und als 1-Klick-Animation speichern.</p>
        </div>
        <button className="btn primary" onClick={newAnimation} disabled={project.scenes.length === 0}>+ Neue Animation</button>
      </div>

      {project.scenes.length === 0 && <div className="empty">Du brauchst zuerst ein paar Szenen (Live-Pult → aufnehmen).</div>}

      <div className="cards" style={{ marginBottom: 20 }}>
        {project.animations.map(a => (
          <div className={'card' + (playing === a.id ? ' on' : '')} key={a.id}>
            <div className="title">{a.name}</div>
            <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>{a.steps.length} Schritte {a.loop ? '· Loop' : ''}</div>
            <div className="row">
              <button className="btn sm primary" onClick={() => play(a.id)}>{playing === a.id ? '■ Stop' : '▶ Play'}</button>
              <button className="btn sm" onClick={() => setEditId(a.id)}>Bearbeiten</button>
              <button className="btn sm del" onClick={() => { removeAnimation(a.id); if (playing === a.id) { control({ kind: 'stopAnimation' }); setPlaying(null) } }}>×</button>
            </div>
          </div>
        ))}
      </div>

      {editing && <AnimationEditor anim={editing} onClose={() => setEditId(null)} />}
    </div>
  )
}

function AnimationEditor({ anim, onClose }: { anim: Animation; onClose: () => void }) {
  const project = useStore(s => s.project)
  const saveAnimation = useStore(s => s.saveAnimation)

  const [name, setName] = useState(anim.name)
  const [loop, setLoop] = useState(anim.loop)
  const [steps, setSteps] = useState<AnimationStep[]>(anim.steps)
  const [addScene, setAddScene] = useState(project.scenes[0]?.id ?? '')

  function commit(next: Partial<Animation>) {
    const updated: Animation = { ...anim, name, loop, steps, ...next }
    saveAnimation(updated)
  }
  function addStep() {
    if (!addScene) return
    const ns = [...steps, { sceneId: addScene, transition: 'fade' as StepTransition, fadeTime: 1, holdTime: 1 }]
    setSteps(ns); saveAnimation({ ...anim, name, loop, steps: ns })
  }
  function updStep(i: number, patch: Partial<AnimationStep>) {
    const ns = steps.map((s, idx) => idx === i ? { ...s, ...patch } : s)
    setSteps(ns); saveAnimation({ ...anim, name, loop, steps: ns })
  }
  function delStep(i: number) {
    const ns = steps.filter((_, idx) => idx !== i)
    setSteps(ns); saveAnimation({ ...anim, name, loop, steps: ns })
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= steps.length) return
    const ns = [...steps];[ns[i], ns[j]] = [ns[j], ns[i]]
    setSteps(ns); saveAnimation({ ...anim, name, loop, steps: ns })
  }
  const sceneName = (id: string) => project.scenes.find(s => s.id === id)?.name ?? '—'

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 640 }}>
        <h3>Animation bearbeiten</h3>
        <div className="row" style={{ marginBottom: 14 }}>
          <label className="field" style={{ flex: 1 }}>Name
            <input type="text" value={name} onChange={e => setName(e.target.value)} onBlur={() => commit({})} />
          </label>
          <label className="field" style={{ justifyContent: 'flex-end' }}>
            <span>&nbsp;</span>
            <button className={'btn' + (loop ? ' primary' : '')} onClick={() => { setLoop(!loop); saveAnimation({ ...anim, name, loop: !loop, steps }) }}>
              {loop ? '🔁 Loop an' : 'Loop aus'}
            </button>
          </label>
        </div>

        <div className="section-h">Schritte</div>
        {steps.length === 0 && <div className="empty">Noch keine Schritte.</div>}
        <div className="col">
          {steps.map((st, i) => (
            <div className="row" key={i} style={{ background: 'var(--bg-3)', padding: 8, borderRadius: 8 }}>
              <span className="tag" style={{ width: 24, textAlign: 'center' }}>{i + 1}</span>
              <select value={st.sceneId} onChange={e => updStep(i, { sceneId: e.target.value })} style={{ flex: 1 }}>
                {project.scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={st.transition} onChange={e => updStep(i, { transition: e.target.value as StepTransition })}>
                <option value="sofort">sofort</option>
                <option value="fade">fade</option>
              </select>
              {st.transition === 'fade' && (
                <label className="field" style={{ width: 70 }}>Fade s
                  <input type="number" min={0} step={0.1} value={st.fadeTime} onChange={e => updStep(i, { fadeTime: Number(e.target.value) })} />
                </label>
              )}
              <label className="field" style={{ width: 70 }}>Warten s
                <input type="number" min={0} step={0.1} value={st.holdTime} onChange={e => updStep(i, { holdTime: Number(e.target.value) })} />
              </label>
              <button className="btn sm" onClick={() => move(i, -1)}>↑</button>
              <button className="btn sm" onClick={() => move(i, 1)}>↓</button>
              <button className="btn sm del" onClick={() => delStep(i)}>×</button>
            </div>
          ))}
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <select value={addScene} onChange={e => setAddScene(e.target.value)} style={{ flex: 1 }}>
            {project.scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn" onClick={addStep}>+ Szene hinzufuegen</button>
        </div>

        <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="btn primary" onClick={onClose}>Fertig</button>
        </div>
      </div>
    </div>
  )
}
