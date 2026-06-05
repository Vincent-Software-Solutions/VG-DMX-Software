// DMX-Ausgabe. Zwei Backends:
//   SimOutput    – tut nichts (App laeuft ohne Hardware, UI zeigt trotzdem Werte)
//   SerialOutput – echter "Open DMX USB"-Betrieb ueber den DSD-TECH (FTDI) via serialport
//
// Der DSD-TECH hat keinen Timing-Chip: wir erzeugen pro Frame ein Break, dann
// Startcode 0x00 + 512 Kanaele bei 250000 Baud / 8N2.

export interface DmxOutput {
  readonly mode: 'sim' | 'serial'
  readonly port?: string
  send(data: Uint8Array): void
  close(): Promise<void>
}

export class SimOutput implements DmxOutput {
  readonly mode = 'sim' as const
  send(_data: Uint8Array): void { /* nur Simulation */ }
  async close(): Promise<void> { /* nichts zu tun */ }
}

export class SerialOutput implements DmxOutput {
  readonly mode = 'serial' as const
  readonly port: string
  private sp: any
  private busy = false
  private frame = Buffer.alloc(513) // [0] = Startcode 0x00, [1..512] = Kanaele

  private constructor(port: string, sp: any) {
    this.port = port
    this.sp = sp
  }

  static async open(port: string): Promise<SerialOutput> {
    const mod = require('serialport')
    const SerialPort = mod.SerialPort || mod
    const sp: any = await new Promise((resolve, reject) => {
      const p = new SerialPort(
        { path: port, baudRate: 250000, dataBits: 8, stopBits: 2, parity: 'none', autoOpen: true },
        (err: any) => (err ? reject(err) : resolve(p))
      )
    })
    return new SerialOutput(port, sp)
  }

  static async list(): Promise<{ path: string; manufacturer?: string }[]> {
    try {
      const mod = require('serialport')
      const SerialPort = mod.SerialPort || mod
      const ports = await SerialPort.list()
      return ports.map((p: any) => ({ path: p.path, manufacturer: p.manufacturer }))
    } catch {
      return []
    }
  }

  send(data: Uint8Array): void {
    if (this.busy || !this.sp || !this.sp.isOpen) return
    this.busy = true
    this.frame[0] = 0
    this.frame.set(data.subarray(0, 512), 1)
    // Break -> kurz halten -> Clear -> Daten schreiben
    this.sp.set({ brk: true }, () => {
      this.sp.set({ brk: false }, () => {
        this.sp.write(this.frame, () => {
          this.sp.drain(() => { this.busy = false })
        })
      })
    })
  }

  async close(): Promise<void> {
    await new Promise<void>((res) => {
      try { this.sp.close(() => res()) } catch { res() }
    })
  }
}

export async function listSerialPorts(): Promise<{ path: string; manufacturer?: string }[]> {
  return SerialOutput.list()
}
