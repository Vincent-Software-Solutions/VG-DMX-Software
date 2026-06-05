import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { AUTO_EFFECTS, AutoEffect, AutoShowConfig } from '../../../shared/types'

const PALETTES: { name: string; colors: string[] }[] = [
  { name: 'Regenbogen', colors: ['#ff0040', '#ff7a00', '#ffe000', '#00ff66', '#00d0ff', '#3366ff', '#cc00ff'] },
  { name: 'Warm', colors: ['#ff2d00', '#ff6a00', '#ffaa00', '#ffd400'] },
  { name: 'Kalt', colors: ['#00d0ff', '#0066ff', '#3300ff', '#00ffcc'] },
  { name: 'Party', colors: ['#ff00aa', '#00d0ff', '#ffe000', '#00ff66'] },
  { name: 'Rot/Blau', colors: ['#ff0030', '#0040ff'] },
  { name: 'Weiss', colors: ['#ffffff', '#ffd9aa'] }
]

export default function AutoShowPanel() {
  const project = useStore(s => s.project)
  const control = useStore(s => s.control)
  const running = useStore(s => s.status.autoShow)

  const groups = Array.from(new Set(project.fixtures.map(f => f.group).filter(Boolean))) as string[]
  const [cfg, setCfg] = useState<AutoShowConfig>({
    effect: 'auto', bpm: 120, energy: 0.6, palette: PALETTES[0].colors, groups: [], movingHeads: true
  })
  const taps = useRef<number[]>([])

  // bei laufender Show Aenderungen sofort uebernehmen
  useEffect(() => { if (running) control({ kind: 'autoShow', config: cfg }) }, [cfg]) // eslint-disable-line

  function start() { control({ kind: 'autoShow', config: cfg }) }
  function stop() { control({ kind: 'autoShow', config: null }) }

  function tap() {
    const now = performance.now()
    taps.current = [...taps.current.filter(t => now - t < 3000), now]
    if (taps.current.length >= 2) {
      const diffs = taps.current.slice(1).map((t, i) => t - taps.current[i])
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length
      const bpm = Math.round(60000 / avg)
      if (bpm >= 40 && bpm <= 250) setCfg(c => ({ ...c, bpm }))
    }
  }
  function toggleGroup(g: string) {
    setCfg(c => ({ ...c, groups: c.groups.includes(g) ? c.groups.filter(x => x !== g) : [...c.groups, g] }))
  }

  return (
    <div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Auto-Show</h1>
          <p className="page-sub">Automatische Shows aus Lampen-Position, Typ & Symmetrie. Platziere Lampen auf der 2D-Buehne fuer beste Ergebnisse.</p>
        </div>
        {running
          ? <button className="btn" style={{ background: 'var(--bad)', borderColor: 'var(--bad)', color: '#fff' }} onClick={stop}>■ Stop</button>
          : <button className="btn primary" onClick={start} disabled={project.fixtures.length === 0}>▶ Auto-Show starten</button>}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="panel col">
          <div className="section-h" style={{ margin: 0 }}>Effekt</div>
          <div className="cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))' }}>
            {AUTO_EFFECTS.map(e => (
              <div className={'card' + (cfg.effect === e.id ? ' on' : '')} key={e.id} onClick={() => setCfg(c => ({ ...c, effect: e.id as AutoEffect }))}>
                <div className="title">{e.label}</div>
                <div className="muted" style={{ fontSize: 11 }}>{e.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel col">
          <div className="section-h" style={{ margin: 0 }}>Tempo & Intensitaet</div>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>BPM: {cfg.bpm}
              <input type="range" min={40} max={220} value={cfg.bpm} onChange={e => setCfg(c => ({ ...c, bpm: Number(e.target.value) }))} />
            </label>
            <button className="btn" onClick={tap} style={{ height: 34, alignSelf: 'flex-end' }}>TAP</button>
          </div>
          <label className="field">Energie: {Math.round(cfg.energy * 100)}%
            <input type="range" min={0} max={100} value={Math.round(cfg.energy * 100)} onChange={e => setCfg(c => ({ ...c, energy: Number(e.target.value) / 100 }))} />
          </label>
          <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={cfg.movingHeads} onChange={e => setCfg(c => ({ ...c, movingHeads: e.target.checked }))} />
            <span>Moving Heads bewegen (Pan/Tilt)</span>
          </label>

          <div className="section-h">Farbpalette</div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {PALETTES.map(p => (
              <button className={'btn sm' + (cfg.palette.join() === p.colors.join() ? ' primary' : '')} key={p.name}
                onClick={() => setCfg(c => ({ ...c, palette: p.colors }))}>{p.name}</button>
            ))}
          </div>
          <div className="swatches">
            {cfg.palette.map((c, i) => <div className="swatch" key={i} style={{ background: c, cursor: 'default' }} />)}
          </div>

          {groups.length > 0 && (
            <>
              <div className="section-h">Nur diese Gruppen (leer = alle)</div>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                {groups.map(g => (
                  <button className={'btn sm' + (cfg.groups.includes(g) ? ' primary' : '')} key={g} onClick={() => toggleGroup(g)}>{g}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
