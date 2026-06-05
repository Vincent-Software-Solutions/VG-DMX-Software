import { contextBridge, ipcRenderer } from 'electron'
import type { Project, ControlAction, EngineStatus, SceneValues, StoredProject, FixtureProfile } from '../shared/types'

export interface WorkspaceSummary {
  activeId: string | null
  projects: { id: string; name: string; updatedAt: number }[]
  active: StoredProject | null
}

const api = {
  // Workspace / Events
  getWorkspace: (): Promise<WorkspaceSummary> => ipcRenderer.invoke('workspace:get'),
  createProject: (name: string): Promise<WorkspaceSummary> => ipcRenderer.invoke('project:create', name),
  renameProject: (id: string, name: string): Promise<WorkspaceSummary> => ipcRenderer.invoke('project:rename', id, name),
  deleteProject: (id: string): Promise<WorkspaceSummary> => ipcRenderer.invoke('project:delete', id),
  duplicateProject: (id: string): Promise<WorkspaceSummary> => ipcRenderer.invoke('project:duplicate', id),
  activateProject: (id: string): Promise<WorkspaceSummary> => ipcRenderer.invoke('project:activate', id),
  saveProject: (id: string, content: Project): Promise<boolean> => ipcRenderer.invoke('project:save', id, content),
  exportProject: (id: string): Promise<boolean> => ipcRenderer.invoke('project:exportFile', id),
  importProject: (): Promise<WorkspaceSummary> => ipcRenderer.invoke('project:importFile'),
  importGdtf: (): Promise<FixtureProfile[]> => ipcRenderer.invoke('fixtures:importGdtf'),

  // Verbindung
  listPorts: (): Promise<{ path: string; manufacturer?: string }[]> => ipcRenderer.invoke('ports:list'),
  connect: (port: string | null): Promise<EngineStatus> => ipcRenderer.invoke('engine:connect', port),
  getStatus: (): Promise<EngineStatus> => ipcRenderer.invoke('engine:status'),

  // Steuerung
  control: (a: ControlAction): Promise<boolean> => ipcRenderer.invoke('engine:control', a),
  snapshot: (): Promise<SceneValues> => ipcRenderer.invoke('engine:snapshot'),

  onStatus: (cb: (s: EngineStatus) => void) => sub('engine:status', cb),
  onFrame: (cb: (f: number[]) => void) => sub('dmx:frame', cb),
  onError: (cb: (msg: string) => void) => sub('engine:error', cb)
}

function sub(channel: string, cb: (data: any) => void): () => void {
  const listener = (_e: unknown, data: any) => cb(data)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
