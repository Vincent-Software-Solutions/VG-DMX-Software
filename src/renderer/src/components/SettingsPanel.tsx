import React, { useState } from 'react'
import { useStore } from '../store'

export default function SettingsPanel() {
  const status = useStore(s => s.status)
  const ports = useStore(s => s.ports)
  const refreshPorts = useStore(s => s.refreshPorts)
  const connect = useStore(s => s.connect)
  const [sel, setSel] = useState('')

  return (
    <div>
      <h1 className="page-title">Einstellungen</h1>
      <p className="page-sub">Verbindung zum DSD TECH USB-DMX-Adapter.</p>

      <div className="panel col" style={{ maxWidth: 620 }}>
        <div className="section-h" style={{ margin: 0 }}>DMX-Ausgang</div>
        <div className="row">
          <span className={'dot ' + (status.connected ? 'on' : 'sim')} />
          <b>{status.connected ? 'Verbunden' : 'Simulationsmodus'}</b>
          {status.port && <span className="muted">· {status.port}</span>}
        </div>

        <div className="row" style={{ marginTop: 6 }}>
          <select value={sel} onChange={e => setSel(e.target.value)} style={{ flex: 1 }}>
            <option value="">— Port waehlen —</option>
            {ports.map(p => <option key={p.path} value={p.path}>{p.path}{p.manufacturer ? ` (${p.manufacturer})` : ''}</option>)}
          </select>
          <button className="btn" onClick={refreshPorts}>↻ Aktualisieren</button>
          <button className="btn primary" disabled={!sel} onClick={() => connect(sel)}>Verbinden</button>
          <button className="btn ghost" onClick={() => connect(null)}>Simulation</button>
        </div>

        {ports.length === 0 && (
          <p className="muted" style={{ fontSize: 12 }}>
            Keine seriellen Ports gefunden. Adapter eingesteckt? Unter Linux ggf. Rechte setzen
            (User zur Gruppe <code>dialout</code> hinzufuegen) und App neu starten.
          </p>
        )}
      </div>

      <div className="panel col" style={{ maxWidth: 620, marginTop: 18 }}>
        <div className="section-h" style={{ margin: 0 }}>Hinweis zur Hardware</div>
        <p className="muted" style={{ lineHeight: 1.6, fontSize: 12.5 }}>
          Der DSD TECH ist ein FTDI-basierter „Open DMX USB"-Typ ohne Timing-Chip — das DMX-Signal
          wird in Software erzeugt (Break + 512 Kanaele @ 250&nbsp;kBaud, ~40&nbsp;Hz). Bei Flackern den
          FTDI „latency timer" auf 1&nbsp;ms stellen. Ohne Adapter laeuft alles im Simulationsmodus,
          die Werte siehst du im DMX-Monitor am Live-Pult.
        </p>
      </div>
    </div>
  )
}
