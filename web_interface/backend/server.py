from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import Commande, SessionLocal, Stand, Piece, SessionLocal, data_db, drop_db, init_db, Boite, Case, Stand
from datetime import datetime
import asyncio
import json
import logging
from typing import List
from pydantic import BaseModel
import sqlite3
import os 

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
        boite = db.query(Boite).filter_by(code_barre=code_barre).first()
        if boite:
            case = db.query(Case).filter_by(idBoite=boite.idBoite).first()
            if case:
                magasin = db.query(Stand).filter_by(idStand=case.idStand).first()
                magasin_nom = magasin.nomStand if magasin else "Inconnu"
                ligne = case.ligne
                colonne = case.colonne
            else:
                magasin_nom, ligne, colonne = "Non défini", "-", "-"
        else:
            magasin_nom, ligne, colonne = "Inconnu", "-", "-"

        id_piece = boite.idPiece

        nouvelle_commande = Commande(
            idBoite=boite.idBoite if boite else None,
            idMagasin=magasin.idStand if 'magasin' in locals() and magasin else None,
            idPoste=poste,
        )
        
        db.add(nouvelle_commande)
        db.commit()
        print(f"[DB] Commande créée : Boite {boite.idBoite if boite else '?'} pour Poste {poste}")

        message = {
            "poste": poste,
            "code_barre": code_barre,
            "id_piece": id_piece,
            "magasin": magasin_nom,
            "ligne": ligne,
            "colonne": colonne,
            "timestamp": datetime.now().isoformat()
        }

        await manager.broadcast(json.dumps(message))

        print(f"[SCAN] Poste {poste} → {code_barre} ({magasin_nom}, L{ligne}, C{colonne})")
        return {"status": "ok", "detail": "scan enregistré"}
    except Exception as e:
        logging.error(f"Erreur lors du scan: {e}")
        return {"status": "error", "detail": str(e)}
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


class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
def login(creds: LoginRequest):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "train.db")
    
    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Vérification des identifiants
        cursor.execute("SELECT * FROM login WHERE username = ? AND password = ?", (creds.username, creds.password))
        user = cursor.fetchone()
        
        if user:
            print(f"Login réussi pour : {creds.username}")
            return {"message": "Login successful"}
        else:
            print(f"Échec connexion pour : {creds.username}")
            raise HTTPException(status_code=401, detail="Identifiants incorrects")
            
    except sqlite3.Error as e:
        print(f"Erreur Base de Données: {e}")
        raise HTTPException(status_code=500, detail="Erreur serveur base de données")
    finally:
        if conn:
            conn.close()

@app.get("/api/admin/dashboard")
def get_admin_dashboard():
    db = SessionLocal()
    try:
        stands = db.query(Stand).all()
        stands_map = {s.idStand: s.nomStand for s in stands}

        commandes = db.query(Commande).order_by(Commande.dateCommande.desc()).all()

        historique_fmt = []
        for c in commandes:
            # --- Récupération du nom de l'objet ---
            nom_objet = "Objet Inconnu"
            if c.boite:
                if c.boite.piece:
                    nom_objet = c.boite.piece.nomPiece
                elif c.boite.code_barre:
                    nom_objet = c.boite.code_barre

            # --- Formatage de l'heure ---
            if c.dateCommande:
                heure_str = c.dateCommande.strftime("%H:%M")
                date_complete = c.dateCommande.strftime("%d/%m %H:%M")
            else:
                heure_str = "--:--"
                date_complete = "--"

            # --- Construction de l'objet pour le front ---
            historique_fmt.append({
                "id": c.idCommande,
                "objet": nom_objet,
                "statut": c.statutCommande,
                
                "heure": heure_str,         
                "date_full": date_complete,

                "source_id": c.idMagasin,
                "source_nom": stands_map.get(c.idMagasin, "Inconnu"),
                "dest_id": c.idPoste,
                "dest_nom": stands_map.get(c.idPoste, "Inconnu"),
            })
            
        return {
            "stands": [{"id": s.idStand, "nom": s.nomStand} for s in stands],
            "historique": historique_fmt
        }
    except Exception as e:
        print(f"Erreur Dashboard: {e}")
        return {"stands": [], "historique": []}
    finally:
        db.close()

@app.get("/api/admin/cycles")
def get_cycles_list():
    db = SessionLocal()
    try:
        stmt = db.query(Commande.dateCommande).order_by(Commande.dateCommande.desc()).all()
        
        cycles = []
        seen = set()
        
        for row in stmt:
            if row.dateCommande:
                cycle_id = row.dateCommande.strftime("%Y-%m-%d %H:%M")
                display = row.dateCommande.strftime("%d/%m/%y à %Hh%M")
                
                if cycle_id not in seen:
                    cycles.append({"id": cycle_id, "label": display})
                    seen.add(cycle_id)
                    
        return cycles[:20]
    finally:
        db.close()

@app.get("/api/admin/logs/{cycle_id}")
def get_cycle_logs(cycle_id: str):
    db = SessionLocal()
    try:
        all_cmds = db.query(Commande).all()
        stands = db.query(Stand).all()
        stands_map = {s.idStand: s.nomStand for s in stands}
        
        logs = []
        logs.append(f"({cycle_id.split(' ')[1]}:00): Début du cycle détecté")

        filtered_cmds = [
            c for c in all_cmds 
            if c.dateCommande and c.dateCommande.strftime("%Y-%m-%d %H:%M") == cycle_id
        ]

        for c in filtered_cmds:
            heure = c.dateCommande.strftime("%H:%M:%S")
            nom_objet = c.boite.code_barre if c.boite else "Inconnu"
            poste_nom = stands_map.get(c.idPoste, "Poste ?")
            mag_nom = stands_map.get(c.idMagasin, "Magasin ?")
            
            logs.append(f"({heure}): Demande {nom_objet} par {poste_nom}")

            if c.statutCommande in ["A déposer", "Terminé"]:
                logs.append(f"(...): Retrait {nom_objet} au {mag_nom}")
            
            if c.statutCommande == "Terminé":
                logs.append(f"(...): Dépôt {nom_objet} au {poste_nom}")

        return {"logs": logs}
    finally:
        db.close()