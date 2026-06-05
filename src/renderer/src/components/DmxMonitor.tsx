import React from 'react'
import { useStore } from '../store'

const EMPTY: number[] = new Array(512).fill(0)

// Zeigt die ersten N Kanaele eines Universe als Balken.
export default function DmxMonitor({ count = 128, universe = 0 }: { count?: number; universe?: number }) {
  const frame = useStore(s => s.frame[universe] ?? EMPTY)
  return (
    <div className="monitor" style={{ gridTemplateColumns: `repeat(${Math.min(count, 64)}, 1fr)` }}>
      {frame.slice(0, count).map((v, i) => (
        <div className="mon-cell" key={i} title={`Kanal ${i + 1}: ${v}`}>
          <div className="mon-fill" style={{ height: `${(v / 255) * 100}%` }} />
        </div>
      ))}
    </div>
  )
}
