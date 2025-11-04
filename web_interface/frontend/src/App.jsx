import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [scans, setScans] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const url =
      (location.protocol === "https:" ? "wss" : "ws") +
      "://" +
      location.hostname +
      ":8000/ws/scans";
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.addEventListener("open", () => setConnected(true));
    ws.addEventListener("close", () => setConnected(false));

    ws.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse(ev.data);
        const entry = {
          poste: data.poste ?? "N/A",
          code_barre: data.code_barre ?? "???",
          magasin: data.magasin ?? "Non défini",
          ligne: data.ligne ?? "-",
          colonne: data.colonne ?? "-",
          timestamp: data.timestamp
            ? new Date(data.timestamp).toLocaleString()
            : new Date().toLocaleString(),
        };
        setScans((prev) => [entry, ...prev].slice(0, 100));
      } catch {
        console.warn("Message non JSON reçu :", ev.data);
      }
    });

    return () => ws.close();
  }, []);

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, Arial",
        background: "#f5f7fa",
        minHeight: "100vh",
        padding: "20px 40px",
      }}
    >
      <h1>📦 Localisation des scans</h1>
      <p>
        WebSocket :{" "}
        <strong style={{ color: connected ? "green" : "red" }}>
          {connected ? "connecté" : "déconnecté"}
        </strong>
      </p>

      <div
        style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#eaf1f9" }}>
            <tr>
              <th style={{ padding: 10 }}>#</th>
              <th style={{ padding: 10 }}>Poste</th>
              <th style={{ padding: 10 }}>Code-barres</th>
              <th style={{ padding: 10 }}>Magasin</th>
              <th style={{ padding: 10 }}>Ligne</th>
              <th style={{ padding: 10 }}>Colonne</th>
              <th style={{ padding: 10 }}>Date / Heure</th>
            </tr>
          </thead>
          <tbody>
            {scans.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 20 }}>
                  Aucun scan reçu
                </td>
              </tr>
            ) : (
              scans.map((s, i) => (
                <tr
                  key={i}
                  style={{
                    background: i % 2 === 0 ? "#fff" : "#f9fafb",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <td style={{ padding: 10 }}>{scans.length - i}</td>
                  <td style={{ padding: 10 }}>{s.poste}</td>
                  <td style={{ padding: 10, fontFamily: "monospace" }}>
                    {s.code_barre}
                  </td>
                  <td style={{ padding: 10 }}>{s.magasin}</td>
                  <td style={{ padding: 10 }}>{s.ligne}</td>
                  <td style={{ padding: 10 }}>{s.colonne}</td>
                  <td style={{ padding: 10 }}>{s.timestamp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
