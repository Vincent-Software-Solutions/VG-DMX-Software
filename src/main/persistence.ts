import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { Workspace, StoredProject, Project, emptyProject } from '../shared/types'

function wsPath(): string {
  return join(app.getPath('userData'), 'workspace.json')
}

function newId(): string {
  return 'prj-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9)
}

function makeProject(name: string): StoredProject {
  const now = Date.now()
  return { id: newId(), name, createdAt: now, updatedAt: now, ...emptyProject() }
}

function normalizeProject(p: any): StoredProject {
  const base = emptyProject()
  return {
    id: p.id ?? newId(),
    name: p.name ?? 'Event',
    createdAt: p.createdAt ?? Date.now(),
    updatedAt: p.updatedAt ?? Date.now(),
    fixtures: Array.isArray(p.fixtures) ? p.fixtures : base.fixtures,
    customProfiles: Array.isArray(p.customProfiles) ? p.customProfiles : base.customProfiles,
    banks: Array.isArray(p.banks) ? p.banks : base.banks,
    scenes: Array.isArray(p.scenes) ? p.scenes : base.scenes,
    animations: Array.isArray(p.animations) ? p.animations : base.animations,
    boards: Array.isArray(p.boards) ? p.boards : base.boards,
    shows: Array.isArray(p.shows) ? p.shows : base.shows
  }
}

export async function loadWorkspace(): Promise<Workspace> {
  try {
    const raw = await fs.readFile(wsPath(), 'utf-8')
    const w = JSON.parse(raw)
    // Migration: altes Einzel-Projekt-Format (project.json-Inhalt)
    if (Array.isArray(w.projects)) {
      const projects = w.projects.map(normalizeProject)
      if (projects.length === 0) projects.push(makeProject('Neues Event'))
      const activeId = projects.find((p: StoredProject) => p.id === w.activeId)?.id ?? projects[0].id
      return { activeId, projects }
    }
    if (w.fixtures || w.scenes) {
      const p = normalizeProject({ ...w, name: 'Importiertes Event' })
      return { activeId: p.id, projects: [p] }
    }
  } catch { /* keine Datei -> Default */ }
  const p = makeProject('Neues Event')
  return { activeId: p.id, projects: [p] }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingWs: Workspace | null = null
export function saveWorkspaceDebounced(w: Workspace) {
  pendingWs = w
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { pendingWs = null; void saveWorkspace(w) }, 350)
}

// Ausstehenden Save sofort schreiben (z.B. beim Beenden) – verhindert Datenverlust.
export async function flushWorkspace(): Promise<void> {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  if (pendingWs) { const w = pendingWs; pendingWs = null; await saveWorkspace(w) }
}

export async function saveWorkspace(w: Workspace): Promise<void> {
  try {
    await fs.writeFile(wsPath(), JSON.stringify(w, null, 2), 'utf-8')
  } catch (e) {
    console.error('Workspace speichern fehlgeschlagen:', e)
  }
}

export { makeProject }
