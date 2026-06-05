import React, { useMemo, useState } from 'react'
import { useStore } from '../store'
import { allProfiles, findProfile, channelCount, suggestAddress, hasOverlap, uid } from '../util'

export default function PatchPanel() {
  const project = useStore(s => s.project)
  const addFixture = useStore(s => s.addFixture)
  const removeFixture = useStore(s => s.removeFixture)
  const patchProject = useStore(s => s.patchProject)

  const profiles = allProfiles(project.customProfiles)
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? '')
  const [modeIndex, setModeIndex] = useState(0)
  const [universe, setUniverse] = useState(0)
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [count, setCount] = useState(1)

  const profile = findProfile(project.customProfiles, profileId)
  const chCount = profile ? channelCount(profile, modeIndex) : 0
  const suggested = useMemo(
    () => suggestAddress(project.fixtures, project.customProfiles, universe, chCount),
    [project.fixtures, project.customProfiles, universe, chCount]
  )
  const [address, setAddress] = useState(1)
  // Adresse bei Aenderungen auf Vorschlag setzen
  React.useEffect(() => { setAddress(suggested) }, [suggested])

  const overlap = hasOverlap(project.fixtures, project.customProfiles, universe, address, chCount)

  function doPatch() {
    if (!profile) return
    patchProject(p => {
      let addr = address
      for (let i = 0; i < count; i++) {
        if (addr + chCount - 1 > 512) break
        p.fixtures.push({
          id: uid('fx'),
          profileId, modeIndex, universe, address: addr,
          name: (name || profile.name) + (count > 1 ? ` ${i + 1}` : ''),
          group: group || undefined
        })
        addr += chCount
      }
    })
    setName('')
  }

  return (
    <div>
      <h1 className="page-title">Patch</h1>
      <p className="page-sub">Fixtures auf DMX-Adressen legen. Die naechste freie Adresse wird automatisch vorgeschlagen.</p>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', alignItems: 'end' }}>
          <label className="field">Fixture
            <select value={profileId} onChange={e => { setProfileId(e.target.value); setModeIndex(0) }}>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.brand} — {p.name}</option>)}
            </select>
          </label>
          <label className="field">Modus
            <select value={modeIndex} onChange={e => setModeIndex(Number(e.target.value))}>
              {profile?.modes.map((m, i) => <option key={i} value={i}>{m.name} ({m.channels.length}ch)</option>)}
            </select>
          </label>
          <label className="field">Universe
            <input type="number" min={0} max={7} value={universe} onChange={e => setUniverse(Number(e.target.value))} />
          </label>
          <label className="field">Startadresse {address !== suggested && <span className="tag" onClick={() => setAddress(suggested)} style={{ cursor: 'pointer' }}>Vorschlag {suggested}</span>}
            <input type="number" min={1} max={512} value={address} onChange={e => setAddress(Number(e.target.value))}
              style={overlap ? { borderColor: 'var(--bad)' } : undefined} />
          </label>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '2fr 2fr 1fr auto', alignItems: 'end', marginTop: 12 }}>
          <label className="field">Name (optional)
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={profile?.name} />
          </label>
          <label className="field">Gruppe (optional)
            <input type="text" value={group} onChange={e => setGroup(e.target.value)} placeholder="z.B. Front PARs" />
          </label>
          <label className="field">Anzahl
            <input type="number" min={1} max={64} value={count} onChange={e => setCount(Number(e.target.value))} />
          </label>
          <button className="btn primary" onClick={doPatch} disabled={overlap || chCount === 0}>
            + Patchen ({chCount}ch{count > 1 ? ` ×${count}` : ''})
          </button>
        </div>
        {overlap && <p style={{ color: 'var(--bad)', margin: '10px 0 0', fontSize: 12 }}>⚠ Adresskonflikt — diese Kanaele sind schon belegt.</p>}
      </div>

      <div className="panel">
        {project.fixtures.length === 0 ? (
          <div className="empty">Noch keine Fixtures gepatcht.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Fixture</th><th>Univ.</th><th>Adresse</th><th>Kanaele</th><th>Gruppe</th><th></th></tr>
            </thead>
            <tbody>
              {[...project.fixtures].sort((a, b) => a.universe - b.universe || a.address - b.address).map(fx => {
                const prof = findProfile(project.customProfiles, fx.profileId)
                const n = prof ? channelCount(prof, fx.modeIndex) : 0
                return (
                  <tr key={fx.id}>
                    <td>{fx.name}</td>
                    <td className="muted">{prof?.brand} {prof?.name}</td>
                    <td>{fx.universe}</td>
                    <td>{fx.address}</td>
                    <td className="muted">{fx.address}–{fx.address + n - 1}</td>
                    <td className="muted">{fx.group ?? '—'}</td>
                    <td><button className="btn sm del" onClick={() => removeFixture(fx.id)}>Loeschen</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
