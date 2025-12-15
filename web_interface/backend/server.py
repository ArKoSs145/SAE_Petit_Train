from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException # <--- CORRECTION ICI
from fastapi.middleware.cors import CORSMiddleware
from database import Commande, SessionLocal, data_db, drop_db, init_db, Boite, Case, Stand
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
        # Recherche du code-barres dans la base
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
            idBoite=boite.idBoite if boite else None, # Sécurité si boite est None
            idMagasin=magasin.idStand if 'magasin' in locals() and magasin else None,
            idPoste=poste,
        )
        # Note: attention, si boite est None, idBoite sera None, assurez-vous que la DB l'accepte ou gérez le cas.
        
        db.add(nouvelle_commande)
        db.commit()
        print(f"[DB] Commande créée : Boite {boite.idBoite if boite else '?'} pour Poste {poste}")
        
        nom_affichage = code_barre 
        if boite:
            if boite.piece:
                nom_affichage = boite.piece.nomPiece
            elif boite.code_barre:
                nom_affichage = boite.code_barre
                
        # Préparer le message pour le front
        message = {
            "poste": poste,
            "code_barre": code_barre,
            "id_piece": id_piece,
            "nom_piece": nom_affichage,
            "magasin": magasin_nom,
            "ligne": ligne,
            "colonne": colonne,
            "timestamp": datetime.now().isoformat()
        }

        # Diffuser via WebSocket
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
    # Attention: ceci réinitialise vos tables SQLalchemy (mais pas train.db qui est sqlite3 pur ici)
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
            # C'est ici que l'import correct de HTTPException est crucial
            raise HTTPException(status_code=401, detail="Identifiants incorrects")
            
    except sqlite3.Error as e:
        print(f"Erreur Base de Données: {e}")
        raise HTTPException(status_code=500, detail="Erreur serveur base de données")
    finally:
        if conn:
            conn.close()

@app.get("/api/commandes/en_cours")
def get_commandes_en_cours():
    db = SessionLocal()
    try:
        commandes = db.query(Commande).filter(Commande.statutCommande != "Terminé").all()
        
        taches = []
        for c in commandes:
            nom_objet = "Inconnu"
            if c.boite:
                if c.boite.piece:
                    nom_objet = c.boite.piece.nomPiece
                elif c.boite.code_barre:
                    nom_objet = c.boite.code_barre
            
            ligne, colonne = 1, 1
            if c.boite and c.boite.Cases:
                case = c.boite.Cases[0]
                ligne = case.ligne
                colonne = case.colonne

            taches.append({
                "id": c.idCommande,
                "poste": str(c.idPoste),
                "magasin_id": str(c.idMagasin) if c.idMagasin else "7",
                "code_barre": nom_objet,
                "statut": c.statutCommande,
                "ligne": ligne,
                "colonne": colonne,
                "timestamp": c.dateCommande.isoformat() if c.dateCommande else None
            })
            
        return taches
    finally:
        db.close()