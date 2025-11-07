import React, { useEffect, useRef, useState } from 'react'

export default function App_2() {
  const [scans, setScans] = useState([])
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const url = (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.hostname + ':8000/ws/scans'
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.addEventListener('open', () => setConnected(true))
    ws.addEventListener('close', () => setConnected(false))
    ws.addEventListener('message', (ev) => {
      const text = ev.data
      let device = 'UNKNOWN'
      let barcode = text
      if (text.includes(':')) {
        const [d, ...rest] = text.split(':')
        device = d
        barcode = rest.join(':')
      }
      const entry = { device, barcode, ts: new Date().toLocaleString() }
      setScans((s) => [entry, ...s].slice(0, 200))
    })

    return () => ws.close()
  }, [])

  return (
    <div style={{ fontFamily: 'Inter, system-ui, Arial', padding: 20 }}>
      <h1>Scanner Dashboard</h1>
      <div>
        WebSocket: <strong style={{ color: connected ? 'green' : 'red' }}>
          {connected ? 'connected' : 'disconnected'}
        </strong>
      </div>

      <div style={{ marginTop: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}>#</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Device</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Barcode</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{scans.length - i}</td>
                <td style={{ padding: 8 }}>{s.device}</td>
                <td style={{ padding: 8, fontFamily: 'monospace' }}>{s.barcode}</td>
                <td style={{ padding: 8 }}>{s.ts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
