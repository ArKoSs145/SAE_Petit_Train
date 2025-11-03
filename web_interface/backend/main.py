from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from database import SessionLocal, init_db, Piece, Boite, Emplacement, Magasin, Commande
import asyncio
import logging
from typing import List

logging.basicConfig(level=logging.INFO)

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    # Crée la base si elle n'existe pas
    init_db()
    print("Base de données initialisée ou déjà existante.")

# ---------------- WebSocket Manager ----------------
class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active.append(websocket)
        logging.info("WebSocket client connected")

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            if websocket in self.active:
                self.active.remove(websocket)
        logging.info("WebSocket client disconnected")

    async def broadcast(self, message: str):
        async with self.lock:
            to_remove = []
            for ws in self.active:
                try:
                    await ws.send_text(message)
                except Exception:
                    to_remove.append(ws)
            for ws in to_remove:
                if ws in self.active:
                    self.active.remove(ws)

manager = ConnectionManager()

# ---------------- WebSocket Endpoint ----------------
@app.websocket("/ws/scans")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # keep connection alive (ignore incoming messages)
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)

# ---------------- TCP Receiver ----------------
async def handle_tcp(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    addr = writer.get_extra_info('peername')
    logging.info(f"TCP client connected: {addr}")
    try:
        while True:
            data = await reader.read(4096)
            if not data:
                break
            text = data.decode('utf-8', errors='ignore').strip()
            if not text:
                continue
            logging.info(f"Received TCP: {text}")
            await manager.broadcast(text)
    except Exception:
        logging.exception("TCP handler error")
    finally:
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass
        logging.info(f"TCP client disconnected: {addr}")

# ---------------- Startup ----------------
async def start_tcp_server(host="0.0.0.0", port=5555):
    server = await asyncio.start_server(handle_tcp, host, port)
    addr = ", ".join(str(sock.getsockname()) for sock in server.sockets)
    logging.info(f"TCP server listening on {addr}")
    async with server:
        await server.serve_forever()

@app.on_event("startup")
async def startup_event():
    logging.info("Starting TCP → WebSocket bridge...")
    asyncio.create_task(start_tcp_server("0.0.0.0", 5555))

@app.get("/")
async def root():
    return {"status": "ok"}

# ---------------- Database Initialization ----------------
@app.post("/scan")
def recevoir_scan(poste: int, code_barre: str):
    db = SessionLocal()
    piece = db.query(Piece).filter_by(code_barre=code_barre).first()

    # Si la pièce n'existe pas encore : on la crée automatiquement
    if not piece:
        piece = Piece(code_barre=code_barre, nom="Inconnu", description="Non renseignée")
        db.add(piece)
        db.commit()
        db.refresh(piece)

    # On enregistre le scan dans la table des scans
    scan = Scan(piece_id=piece.id, poste=poste)
    db.add(scan)
    db.commit()
    db.close()

    return {"status": "ok", "piece": piece.code_barre, "poste": poste}
