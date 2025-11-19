from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from database import Commande, SessionLocal, data_db, drop_db, init_db, Boite, Emplacement, Magasin
from datetime import datetime
import asyncio
import json
import logging
from typing import List

logging.basicConfig(level=logging.INFO)

app = FastAPI()

# --- Autoriser le front React ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Gestion WebSocket ---
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

# --- Endpoint WebSocket ---
@app.websocket("/ws/scans")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)

# --- Endpoint HTTP /scan (pour sender.py) ---
@app.post("/scan")
async def recevoir_scan(request: Request):
    """Réception d’un scan depuis sender.py (HTTP POST)"""
    data = await request.json()
    poste = data.get("poste")
    code_barre = data.get("code_barre")

    db = SessionLocal()
    try:
        # Recherche du code-barres dans la base
        boite = db.query(Boite).filter_by(code_barre=code_barre).first()
        if boite:
            emplacement = db.query(Emplacement).filter_by(idBoite=boite.idBoite).first()
            if emplacement:
                magasin = db.query(Magasin).filter_by(idMagasin=emplacement.idMagasin).first()
                magasin_nom = magasin.nomMagasin if magasin else "Inconnu"
                ligne = emplacement.ligne
                colonne = emplacement.colonne
            else:
                magasin_nom, ligne, colonne = "Non défini", "-", "-"
        else:
            magasin_nom, ligne, colonne = "Inconnu", "-", "-"

        nouvelle_commande = Commande(
            idBoite=boite.idBoite,
            idMagasin=magasin.idMagasin
            # dateCommande est ajouté automatiquement par défaut (datetime.utcnow)
        )
        db.add(nouvelle_commande)
        db.commit()
        print(f"[DB] Commande créée : Boite {boite.idBoite} (Magasin {magasin.idMagasin})")

        # Préparer le message pour le front
        message = {
            "poste": poste,
            "code_barre": code_barre,
            "magasin": magasin_nom,
            "ligne": ligne,
            "colonne": colonne,
            "timestamp": datetime.now().isoformat()
        }

        # Diffuser via WebSocket
        await manager.broadcast(json.dumps(message))

        print(f"[SCAN] Poste {poste} → {code_barre} ({magasin_nom}, L{ligne}, C{colonne})")
        return {"status": "ok", "detail": "scan enregistré"}
    finally:
        db.close()

# --- Démarrage serveur ---
@app.on_event("startup")
async def startup_event():
    logging.info("Initialisation de la base de données...")
    drop_db()
    init_db()
    data_db()
    logging.info("Base prête ✅")

@app.get("/")
async def root():
    return {"status": "ok"}
