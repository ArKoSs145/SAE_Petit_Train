import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [scans, setScans] = useState([]);
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);

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
        // Les messages envoyés par FastAPI sont en JSON
        const data = JSON.parse(ev.data);
        const entry = {
          poste: data.poste ?? "N/A",
          code_barre: data.code_barre ?? "???",
          status: data.status ?? "inconnu",
          qte: data.qte ?? "-",
          timestamp: data.timestamp
            ? new Date(data.timestamp).toLocaleString()
            : new Date().toLocaleString(),
        };

        setScans((prev) => [entry, ...prev].slice(0, 200));
      } catch {
        console.warn("Message non JSON :", ev.data);
      }
    });

    return () => ws.close();
  }, []);

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, Arial",
        backgroundColor: "#f7f9fb",
        minHeight: "100vh",
        padding: "20px 40px",
      }}
    >
      <h1 style={{ marginBottom: 10 }}>📦 Scanner Dashboard</h1>
      <div style={{ marginBottom: 20 }}>
        WebSocket :{" "}
        <strong style={{ color: connected ? "green" : "red" }}>
          {connected ? "connecté" : "déconnecté"}
        </strong>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 15,
          }}
        >
          <thead style={{ background: "#eaf1f9", textAlign: "left" }}>
            <tr>
              <th style={{ padding: 10 }}>#</th>
              <th style={{ padding: 10 }}>Poste</th>
              <th style={{ padding: 10 }}>Code-barres</th>
              <th style={{ padding: 10 }}>Statut</th>
              <th style={{ padding: 10 }}>Quantité</th>
              <th style={{ padding: 10 }}>Date / Heure</th>
            </tr>
          </thead>
          <tbody>
            {scans.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: "center",
                    padding: 20,
                    color: "#777",
                  }}
                >
                  Aucun scan reçu pour l’instant...
                </td>
              </tr>
            ) : (
              scans.map((s, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid #eee",
                    background:
                      i % 2 === 0 ? "white" : "rgba(240,240,240,0.3)",
                  }}
                >
                  <td style={{ padding: 10 }}>{scans.length - i}</td>
                  <td style={{ padding: 10, fontWeight: "bold" }}>
                    {s.poste}
                  </td>
                  <td
                    style={{
                      padding: 10,
                      fontFamily: "monospace",
                      color: "#0070f3",
                    }}
                  >
                    {s.code_barre}
                  </td>
                  <td
                    style={{
                      padding: 10,
                      color:
                        s.status.includes("nouvelle") || s.status === "nouvelle"
                          ? "green"
                          : "orange",
                      fontWeight: 500,
                    }}
                  >
                    {s.status}
                  </td>
                  <td style={{ padding: 10, textAlign: "center" }}>
                    {s.qte}
                  </td>
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
