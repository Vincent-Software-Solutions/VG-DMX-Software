import React, { useState, useEffect } from 'react'
import { useStore } from '../store'
import { findProfile, FUNC_LABELS } from '../util'

const EMPTY: number[] = new Array(512).fill(0)

// Manuelle Einzelkanal-Steuerung pro Lampe (roh, ueberschreibt alles per LTP).
export default function ChannelsPanel() {
  const project = useStore(s => s.project)
  const frame = useStore(s => s.frame)
  const control = useStore(s => s.control)
  const [open, setOpen] = useState<string | null>(project.fixtures[0]?.id ?? null)
  const [overrides, setOverrides] = useState<Record<string, number>>({})

  // Bei Projektwechsel Overrides verwerfen (Adressen/Fixtures sind dann andere)
  useEffect(() => { setOverrides({}); control({ kind: 'clearLiveChannels' }) }, [project.id]) // eslint-disable-line

  function setCh(universe: number, channel: number, value: number) {
    if (!Number.isFinite(value)) return
    setOverrides(o => ({ ...o, [`${universe}:${channel}`]: value }))
    control({ kind: 'liveChannel', universe, channel, value })
  }
  function clearCh(universe: number, channel: number) {
    setOverrides(o => { const n = { ...o }; delete n[`${universe}:${channel}`]; return n })
    control({ kind: 'liveChannel', universe, channel, value: null })
  }
  function resetAll() {
    setOverrides({})
    control({ kind: 'clearLiveChannels' })
  }

  return (
    <div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Kanaele (DMX)</h1>
          <p className="page-sub">Jeden Kanal jeder Lampe direkt steuern. Diese Werte ueberschreiben Szenen & Live (LTP).</p>
        </div>
        <button className="btn sm del" onClick={resetAll}>Kanal-Overrides zuruecksetzen</button>
      </div>

      {project.fixtures.length === 0 ? (
        <div className="empty">Noch keine Fixtures — gehe zu <b>Patch</b>.</div>
      ) : (
        <div className="col">
          {[...project.fixtures].sort((a, b) => a.universe - b.universe || a.address - b.address).map(fx => {
            const prof = findProfile(project.customProfiles, fx.profileId)
            const mode = prof?.modes[fx.modeIndex]
            const expanded = open === fx.id
            return (
              <div className="panel" key={fx.id} style={{ padding: 0 }}>
                <div className="row" style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => setOpen(expanded ? null : fx.id)}>
                  <span style={{ width: 16 }}>{expanded ? '▾' : '▸'}</span>
                  <b style={{ flex: 1 }}>{fx.name}</b>
                  <span className="tag">U{fx.universe}</span>
                  <span className="tag">@{fx.address}–{fx.address + (mode?.channels.length ?? 1) - 1}</span>
                  <span className="muted" style={{ fontSize: 11 }}>{prof?.name}</span>
                </div>
                {expanded && mode && (
                  <div className="ch-grid">
                    {mode.channels.map((c, i) => {
                      const channel = fx.address + i
                      const key = `${fx.universe}:${channel}`
                      const live = (frame[fx.universe] ?? EMPTY)[channel - 1] ?? 0
                      const val = overrides[key] ?? live
                      return (
                        <div className="ch-cell" key={i} title="Doppelklick auf Fader: Kanal freigeben">
                          <div className="ch-num">{channel}</div>
                          <div className="ch-fn">{c.name || FUNC_LABELS[c.function]}</div>
                          <input className="vfader" type="range" min={0} max={255} value={val}
                            onChange={e => setCh(fx.universe, channel, Number(e.target.value))}
                            onDoubleClick={() => clearCh(fx.universe, channel)} />
                          <input className="ch-val" type="number" min={0} max={255} value={val}
                            onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) setCh(fx.universe, channel, Math.max(0, Math.min(255, n))) }} />
                          <div className="ch-bar"><div style={{ height: `${(live / 255) * 100}%` }} /></div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
