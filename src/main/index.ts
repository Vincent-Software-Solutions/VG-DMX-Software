import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { Engine } from './dmx/Engine'
import { listSerialPorts } from './dmx/DmxOutput'
import { loadWorkspace, saveWorkspaceDebounced, flushWorkspace, makeProject } from './persistence'
import { parseGdtf } from './gdtf'
import { Project, ControlAction, Workspace, StoredProject, FixtureProfile } from '../shared/types'

const engine = new Engine()
let win: BrowserWindow | null = null
let workspace: Workspace = { activeId: null, projects: [] }

function activeProject(): StoredProject | undefined {
  return workspace.projects.find(p => p.id === workspace.activeId)
}

function parentWin(): BrowserWindow | undefined {
  return win && !win.isDestroyed() ? win : undefined
}

function applyActiveToEngine() {
  const p = activeProject()
  if (p) engine.setProject(p)
}

function summary() {
  return {
    activeId: workspace.activeId,
    projects: workspace.projects.map(p => ({ id: p.id, name: p.name, updatedAt: p.updatedAt })),
    active: activeProject() ?? null
  }
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1120,
    minHeight: 700,
    show: false,
    backgroundColor: '#0c0e13',
    autoHideMenuBar: true,
    title: 'VG | DMX Software',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win?.show())
  win.webContents.setWindowOpenHandler((d) => { shell.openExternal(d.url); return { action: 'deny' } })

  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

function broadcast(channel: string, payload: unknown) {
  win?.webContents.send(channel, payload)
}

app.whenReady().then(async () => {
  workspace = await loadWorkspace()
  applyActiveToEngine()
  engine.start()

  engine.on('status', (s) => broadcast('engine:status', s))
  engine.on('frame', (f) => broadcast('dmx:frame', f))
  engine.on('error', (msg) => broadcast('engine:error', msg))

  // ---- Workspace / Events ----
  ipcMain.handle('workspace:get', () => summary())

  ipcMain.handle('project:create', (_e, name: string) => {
    const p = makeProject(name || 'Neues Event')
    workspace.projects.push(p)
    workspace.activeId = p.id
    applyActiveToEngine()
    saveWorkspaceDebounced(workspace)
    return summary()
  })

  ipcMain.handle('project:rename', (_e, id: string, name: string) => {
    const p = workspace.projects.find(x => x.id === id)
    if (p) { p.name = name; p.updatedAt = Date.now() }
    saveWorkspaceDebounced(workspace)
    return summary()
  })

  ipcMain.handle('project:delete', (_e, id: string) => {
    workspace.projects = workspace.projects.filter(x => x.id !== id)
    if (workspace.activeId === id) workspace.activeId = workspace.projects[0]?.id ?? null
    if (workspace.projects.length === 0) {
      const p = makeProject('Neues Event'); workspace.projects.push(p); workspace.activeId = p.id
    }
    applyActiveToEngine()
    saveWorkspaceDebounced(workspace)
    return summary()
  })

  ipcMain.handle('project:duplicate', (_e, id: string) => {
    const src = workspace.projects.find(x => x.id === id)
    if (src) {
      const copy = makeProject(src.name + ' (Kopie)')
      Object.assign(copy, structuredClone({
        fixtures: src.fixtures, customProfiles: src.customProfiles, banks: src.banks,
        scenes: src.scenes, animations: src.animations, boards: src.boards, shows: src.shows
      }))
      workspace.projects.push(copy)
      workspace.activeId = copy.id
      applyActiveToEngine()
      saveWorkspaceDebounced(workspace)
    }
    return summary()
  })

  ipcMain.handle('project:activate', (_e, id: string) => {
    if (workspace.projects.some(p => p.id === id)) {
      workspace.activeId = id
      applyActiveToEngine()
      saveWorkspaceDebounced(workspace)
    }
    return summary()
  })

  // Inhalt des aktiven Projekts speichern – nur Inhaltsfelder, Metadaten (id/name/createdAt) schuetzen
  ipcMain.handle('project:save', (_e, id: string, content: Project) => {
    const p = workspace.projects.find(x => x.id === id)
    if (p) {
      p.fixtures = content.fixtures ?? p.fixtures
      p.customProfiles = content.customProfiles ?? p.customProfiles
      p.banks = content.banks ?? p.banks
      p.scenes = content.scenes ?? p.scenes
      p.animations = content.animations ?? p.animations
      p.boards = content.boards ?? p.boards
      p.shows = content.shows ?? p.shows
      p.updatedAt = Date.now()
      if (id === workspace.activeId) applyActiveToEngine()
      saveWorkspaceDebounced(workspace)
    }
    return true
  })

  // ---- Event Export / Import als Datei ----
  ipcMain.handle('project:exportFile', async (_e, id: string) => {
    const p = workspace.projects.find(x => x.id === id)
    if (!p) return false
    const res = await dialog.showSaveDialog(parentWin(), {
      title: 'Event exportieren',
      defaultPath: `${p.name.replace(/[^\w\- ]+/g, '')}.vgdmx.json`,
      filters: [{ name: 'VG DMX Event', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePath) return false
    await fs.writeFile(res.filePath, JSON.stringify(p, null, 2), 'utf-8')
    return true
  })

  ipcMain.handle('project:importFile', async () => {
    const res = await dialog.showOpenDialog(parentWin(), {
      title: 'Event importieren', properties: ['openFile'],
      filters: [{ name: 'VG DMX Event', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePaths[0]) return summary()
    try {
      const raw = await fs.readFile(res.filePaths[0], 'utf-8')
      const data = JSON.parse(raw)
      const np = makeProject((data.name || 'Importiertes Event') + ' (Import)')
      const arr = (v: any, fb: any) => Array.isArray(v) ? v : fb
      np.fixtures = arr(data.fixtures, np.fixtures)
      np.customProfiles = arr(data.customProfiles, np.customProfiles)
      np.banks = data.banks?.length ? arr(data.banks, np.banks) : np.banks
      np.scenes = arr(data.scenes, np.scenes)
      np.animations = arr(data.animations, np.animations)
      np.boards = data.boards?.length ? arr(data.boards, np.boards) : np.boards
      np.shows = arr(data.shows, np.shows)
      workspace.projects.push(np)
      workspace.activeId = np.id
      applyActiveToEngine()
      saveWorkspaceDebounced(workspace)
    } catch (e) {
      broadcast('engine:error', `Import fehlgeschlagen: ${(e as Error).message}`)
    }
    return summary()
  })

  ipcMain.handle('fixtures:importGdtf', async () => {
    const res = await dialog.showOpenDialog(parentWin(), {
      title: 'GDTF-Fixtures importieren', properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'GDTF', extensions: ['gdtf'] }]
    })
    if (res.canceled) return [] as FixtureProfile[]
    const out: FixtureProfile[] = []
    for (const f of res.filePaths) {
      try { out.push(...await parseGdtf(f)) }
      catch (e) { broadcast('engine:error', `GDTF "${f}": ${(e as Error).message}`) }
    }
    return out
  })

  // ---- Verbindung ----
  ipcMain.handle('ports:list', () => listSerialPorts())
  ipcMain.handle('engine:connect', (_e, port: string | null) => engine.connect(port))
  ipcMain.handle('engine:status', () => engine.status())

  // ---- Steuerung ----
  ipcMain.handle('engine:control', (_e, a: ControlAction) => { engine.control(a); return true })
  ipcMain.handle('engine:snapshot', () => engine.snapshot())

  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

  // Auto-Update (nur im gepackten Build, gegen GitHub-Releases)
  if (app.isPackaged) {
    try {
      const { autoUpdater } = require('electron-updater')
      autoUpdater.autoDownload = true
      autoUpdater.on('update-downloaded', () => broadcast('engine:error', 'Update geladen – wird beim naechsten Start installiert.'))
      autoUpdater.checkForUpdatesAndNotify().catch(() => { /* offline o.ae. */ })
    } catch { /* updater nicht verfuegbar */ }
  }
})

let quitting = false
app.on('before-quit', async (e) => {
  if (quitting) return
  e.preventDefault()
  quitting = true
  await flushWorkspace()
  await engine.stop()
  app.exit(0)
})

app.on('window-all-closed', async () => {
  await flushWorkspace()
  await engine.stop()
  if (process.platform !== 'darwin') app.quit()
})
