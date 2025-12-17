from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
# Assure-toi que database.py est bien au même niveau
from database import Commande, SessionLocal, Stand, data_db, init_db, Boite, Case, Cycle
from datetime import datetime
import asyncio
import json
import logging
from typing import List
from pydantic import BaseModel
import sqlite3
import os 
import csv
import requetes

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

# --- FONCTION DE TRAITEMENT CONFIGURATION (Interne) ---
def traiter_fichier_config(csv_content: str, db):
    """
    1. Analyse le CSV pour générer le JSON (Frontend)
    2. Met à jour la BDD (Backend) avec les positions X,Y
    """
    # --- A. Lecture du CSV ---
    grid = []
    # On utilise splitlines pour simuler un fichier ligne par ligne
    reader = csv.reader(csv_content.splitlines())
    rows = list(reader)
    
    # Détection du nom du poste (ex: "Poste1")
    nom_poste = "Inconnu"
    start_row = 0
    if rows and (len(rows[0]) < 2 or (rows[0][0] and "Poste" in rows[0][0])):
        nom_poste = rows[0][0].strip()
        start_row = 1
    
    # Construction de la grille propre
    for r in rows[start_row:]:
        cleaned = [c.strip() for c in r if c.strip()]
        if cleaned: grid.append(cleaned)
            
    nb_rows = len(grid)
    nb_cols = max(len(r) for r in grid) if nb_rows > 0 else 0

    print(f"[CONFIG] Traitement grille {nb_rows}x{nb_cols} pour {nom_poste}")

    # --- B. Récupération du Stand (Magasin) en BDD ---
    stand = db.query(Stand).filter(Stand.nomStand == nom_poste).first()
    if not stand:
        stand = Stand(nomStand=nom_poste)
        db.add(stand)
        db.commit()
        db.refresh(stand)

    # --- C. Traitement des Cases (Flood Fill pour fusion + Update DB) ---
    visited = set()
    items_json = [] 
    
    for r in range(nb_rows):
        # Attention aux lignes de longueurs variables
        current_cols = len(grid[r])
        for c in range(current_cols):
            if (r, c) in visited: continue
            
            val = grid[r][c] # Le Code Barre
            
            # 1. Algorithme de fusion
            stack = [(r, c)]
            visited.add((r, c))
            group = []
            
            while stack:
                curr_r, curr_c = stack.pop()
                group.append((curr_r, curr_c))
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nr, nc = curr_r + dr, curr_c + dc
                    if 0 <= nr < nb_rows and 0 <= nc < len(grid[nr]):
                        if grid[nr][nc] == val and (nr, nc) not in visited:
                            visited.add((nr, nc))
                            stack.append((nr, nc))
            
            # Calcul géométrie
            rs, cs = [p[0] for p in group], [p[1] for p in group]
            row_start, col_start = min(rs) + 1, min(cs) + 1
            row_span = max(rs) - min(rs) + 1
            col_span = max(cs) - min(cs) + 1
            
            # 2. MISE À JOUR BDD
            boite = db.query(Boite).filter(Boite.code_barre == val).first()
            if not boite:
                boite = Boite(code_barre=val)
                db.add(boite)
                db.commit()
                db.refresh(boite)
            
            case_db = db.query(Case).filter(Case.idBoite == boite.idBoite).first()
            if not case_db:
                case_db = Case(idBoite=boite.idBoite, idStand=stand.idStand)
                db.add(case_db)
            else:
                case_db.idStand = stand.idStand # S'assurer qu'elle est sur le bon stand
            
            case_db.ligne = row_start
            case_db.colonne = col_start
            db.commit()

            # 3. Préparation Item JSON
            items_json.append({
                "id": f"{r}-{c}",
                "r": r, "c": c,
                "val": val,
                "isMerged": (row_span > 1 or col_span > 1),
                "style": {
                    "gridRow": f"{row_start} / span {row_span}",
                    "gridColumn": f"{col_start} / span {col_span}"
                }
            })

    # --- D. Génération et Sauvegarde du JSON ---
    data_json = {
        "layout": {
            "templateRows": f"repeat({nb_rows}, 1fr)",
            "templateColumns": f"repeat({nb_cols}, 1fr)"
        },
        "items": items_json
    }
    
    # Chemin vers le dossier public
    # On remonte de 'backend' vers 'frontend/public'
    # Adapte ce chemin si ton server.py n'est pas dans web_interface/backend
    json_path = os.path.join("..", "frontend", "public", "etagere.json")
    
    # Fallback si on lance depuis la racine du projet
    if not os.path.exists(os.path.join("..", "frontend")):
         json_path = os.path.join("web_interface", "frontend", "public", "etagere.json")

    os.makedirs(os.path.dirname(json_path), exist_ok=True)
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data_json, f, indent=2)
        
    return {"status": "ok", "message": f"BDD mise à jour et JSON généré pour {nom_poste}"}


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

@app.websocket("/ws/scans")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)

@app.post("/scan")
async def recevoir_scan(request: Request):
    data = await request.json()
    poste = data.get("poste")
    code_barre = data.get("code_barre")

    db = SessionLocal()
    try:
        boite = db.query(Boite).filter_by(code_barre=code_barre).first()
        magasin = None
        
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

        id_piece = boite.idPiece if boite else None

        nouvelle_commande = Commande(
            idBoite=boite.idBoite if boite else None,
            idMagasin=magasin.idStand if magasin else None,
            idPoste=poste,
            statutCommande="En cours"
        )
        
        db.add(nouvelle_commande)
        db.commit()
        db.refresh(nouvelle_commande)
        
        nom_affichage = code_barre 
        if boite:
            if boite.piece:
                nom_affichage = boite.piece.nomPiece
            elif boite.code_barre:
                nom_affichage = boite.code_barre
                
        message = {
            "id_commande": nouvelle_commande.idCommande,
            "poste": poste,
            "code_barre": code_barre,
            "id_piece": id_piece,
            "nom_piece": nom_affichage,
            "magasin": magasin_nom,
            "magasin_id": str(magasin.idStand) if magasin else None,
            "ligne": ligne,
            "colonne": colonne,
            "timestamp": datetime.now().isoformat()
        }

        await manager.broadcast(json.dumps(message))
        return {"status": "ok", "detail": "scan enregistré"}
    except Exception as e:
        logging.error(f"Erreur lors du scan: {e}")
        return {"status": "error", "detail": str(e)}
    finally:
        db.close()


# --- ROUTE CONFIGURATION (JSON) ---
class ConfigPayload(BaseModel):
    csv_content: str

@app.post("/api/admin/upload-config")
def upload_config_json(payload: ConfigPayload):
    """
    Reçoit le contenu du CSV directement en texte (JSON).
    """
    print("📥 Réception configuration JSON...")
    db = SessionLocal()
    try:
        resultat = traiter_fichier_config(payload.csv_content, db)
        return resultat
    except Exception as e:
        print(f"❌ Erreur Upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# --- Démarrage et Login ---
@app.on_event("startup")
async def startup_event():
    logging.info("Initialisation de la base de données...")
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
        cursor.execute("SELECT * FROM login WHERE username = ? AND password = ?", (creds.username, creds.password))
        user = cursor.fetchone()
        if user:
            return {"message": "Login successful"}
        else:
            raise HTTPException(status_code=401, detail="Identifiants incorrects")
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail="Erreur serveur base de données")
    finally:
        if conn: conn.close()

# --- Routes Admin (Dashboard, Logs, Cycles) ---
@app.get("/api/admin/dashboard")
def get_admin_dashboard():
    db = SessionLocal()
    try:
        stands = db.query(Stand).all()
        stands_map = {s.idStand: s.nomStand for s in stands}
        commandes = db.query(Commande).order_by(Commande.dateCommande.desc()).all()
        grouped_history = {} 

        for c in commandes:
            nom_objet = "Objet Inconnu"
            if c.boite:
                if c.boite.piece: nom_objet = c.boite.piece.nomPiece
                elif c.boite.code_barre: nom_objet = c.boite.code_barre

            if c.dateCommande:
                heure_str = c.dateCommande.strftime("%H:%M")
                date_complete = c.dateCommande.strftime("%d/%m %H:%M")
            else:
                heure_str, date_complete = "--:--", "--"
            
            key = (nom_objet, c.idMagasin, c.idPoste, c.statutCommande, heure_str)
            if key in grouped_history:
                grouped_history[key]["count"] += 1
            else:
                grouped_history[key] = {
                    "count": 1, "id": c.idCommande, "objet": nom_objet,
                    "statut": c.statutCommande, "heure": heure_str, "date_full": date_complete,
                    "source_id": c.idMagasin, "source_nom": stands_map.get(c.idMagasin, "Inconnu"),
                    "dest_id": c.idPoste, "dest_nom": stands_map.get(c.idPoste, "Inconnu"),
                }

        historique_fmt = list(grouped_history.values())
        historique_fmt.sort(key=lambda x: x["date_full"], reverse=True)
        return {"stands": [{"id": s.idStand, "nom": s.nomStand} for s in stands], "historique": historique_fmt}
    except Exception as e:
        return {"stands": [], "historique": []}
    finally:
        db.close()

@app.get("/api/admin/cycles")
def get_cycles_list():
    db = SessionLocal()
    try:
        cycles_db = db.query(Cycle).order_by(Cycle.date_debut.desc()).limit(20).all()
        cycles_fmt = []
        for c in cycles_db:
            if c.date_debut:
                cycle_id = c.date_debut.strftime("%Y-%m-%d %H:%M:%S")
                start_str = c.date_debut.strftime("%d/%m à %Hh%M")
                if c.date_fin:
                    end_str = c.date_fin.strftime("%Hh%M")
                    label = f"{start_str} - {end_str}"
                else:
                    label = f"{start_str} (En cours...)"
                cycles_fmt.append({"id": cycle_id, "label": label})
        return cycles_fmt
    finally:
        db.close()

@app.get("/api/admin/logs/{cycle_id}")
def get_cycle_logs(cycle_id: str):
    try:
        date_obj = datetime.strptime(cycle_id, "%Y-%m-%d %H:%M:%S")
        logs = requetes.get_commandes_cycle_logs(date_obj)
        return {"logs": logs}
    except Exception as e:
        return {"logs": [f"Erreur: {str(e)}"]}

@app.post("/api/cycle/start")
def start_cycle():
    db = SessionLocal()
    try:
        actif = db.query(Cycle).filter(Cycle.date_fin == None).first()
        if actif: return {"status": "error", "message": "Un cycle est déjà en cours"}
        nouveau = Cycle(date_debut=datetime.now())
        db.add(nouveau)
        db.commit()
        return {"status": "ok", "date_debut": nouveau.date_debut}
    finally:
        db.close()

@app.post("/api/cycle/stop")
def stop_cycle():
    db = SessionLocal()
    try:
        actif = db.query(Cycle).filter(Cycle.date_fin == None).first()
        if not actif: return {"status": "error", "message": "Aucun cycle actif"}
        actif.date_fin = datetime.now()
        db.commit()
        return {"status": "ok"}
    finally:
        db.close()

@app.get("/api/commandes/en_cours")
def get_commandes_en_cours():
    db = SessionLocal()
    try:
        commandes = db.query(Commande).filter(Commande.statutCommande != "Terminé").all()
        taches = []
        for c in commandes:
            nom_objet = "Inconnu"
            if c.boite:
                if c.boite.piece: nom_objet = c.boite.piece.nomPiece
                elif c.boite.code_barre: nom_objet = c.boite.code_barre
            
            ligne, colonne = 1, 1
            if c.boite and c.boite.Cases:
                case = c.boite.Cases[0]
                ligne = case.ligne
                colonne = case.colonne

            taches.append({
                "id": c.idCommande, "poste": str(c.idPoste), "magasin_id": str(c.idMagasin) if c.idMagasin else "7",
                "code_barre": nom_objet, "statut": c.statutCommande, "ligne": ligne, "colonne": colonne,
                "timestamp": c.dateCommande.isoformat() if c.dateCommande else None
            })
        return taches
    finally:
        db.close()

class StatutUpdate(BaseModel):
    nouveau_statut: str

@app.put("/api/commande/{id_commande}/statut")
def update_statut(id_commande: int, update: StatutUpdate):
    try:
        resultat = requetes.changer_statut_commande(id_commande)
        if resultat["status"] == "error":
            raise HTTPException(status_code=404, detail=resultat["message"])
        
        if "commande" in resultat:
            return {"status": "ok", "nouveau_statut": resultat["commande"]["nouveau_statut"]}
        else:
            return {"status": "ok", "message": resultat["message"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))