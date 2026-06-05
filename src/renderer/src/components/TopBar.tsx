import React from 'react'
import { useStore } from '../store'

export default function TopBar() {
  const status = useStore(s => s.status)
  const control = useStore(s => s.control)
  const projects = useStore(s => s.projects)
  const activeId = useStore(s => s.activeId)
  const openProject = useStore(s => s.openProject)
  const goStart = useStore(s => s.goStart)

  const dotClass = status.connected ? 'dot on' : 'dot sim'
  const statusText = status.connected ? `Verbunden · ${status.port ?? ''}` : 'Simulation'

  return (
    <header className="topbar">
      <div className="brand">VG <span>|</span> DMX</div>

      <button className="btn sm ghost" onClick={goStart} title="Zur Event-Uebersicht">☰ Events</button>

      <select className="prj-select" value={activeId ?? ''} onChange={e => openProject(e.target.value)}>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <div className="status-pill">
        <span className={dotClass} />{statusText}
      </div>

      <div className="spacer" />

      {status.autoShow && <span className="tag" style={{ color: 'var(--accent)' }}>● Auto-Show</span>}

      <div className="master-fader">
        <span className="lbl">Master {Math.round(status.master * 100)}%</span>
        <input type="range" min={0} max={100} value={Math.round(status.master * 100)}
          onChange={e => control({ kind: 'master', value: Number(e.target.value) / 100 })} />
      </div>

      <button className={'qbtn fog' + (status.fog ? ' active' : '')} onClick={() => control({ kind: 'fog', value: !status.fog })}>FOG</button>
      <button className={'qbtn strobe' + (status.strobe > 0 ? ' active' : '')} onClick={() => control({ kind: 'strobe', value: status.strobe > 0 ? 0 : 12 })}>STROBE</button>
      <button className={'qbtn blackout' + (status.blackout ? ' active' : '')} onClick={() => control({ kind: 'blackout', value: !status.blackout })}>BLACKOUT</button>
    </header>
  )
}
