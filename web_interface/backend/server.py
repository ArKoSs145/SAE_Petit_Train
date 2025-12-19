from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import Commande, SessionLocal, Stand, Piece, SessionLocal, data_db, drop_db, init_db, Boite, Case, Stand, Cycle
from datetime import datetime
import asyncio
import json
import logging
from typing import List
from pydantic import BaseModel
import sqlite3
import os 
import requetes
from pydantic import BaseModel 
from sqlalchemy import func

logging.basicConfig(level=logging.INFO)

app = FastAPI()

# --- Autoriser le front React ---
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
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
        db.refresh(nouvelle_commande)
        print(f"[DB] Commande créée : Boite {boite.idBoite if boite else '?'} pour Poste {poste}")
        
        nom_affichage = code_barre 
        if boite:
            if boite.piece:
                nom_affichage = boite.piece.nomPiece
            elif boite.code_barre:
                nom_affichage = boite.code_barre
                
        # Préparer le message pour le front
        message = {
            "id_commande": nouvelle_commande.idCommande,
            "poste": poste,
            "code_barre": code_barre,
            "id_piece": id_piece,
            "nom_piece": nom_affichage,
            "magasin": magasin_nom,
            "magasin_id": str(magasin.idStand) if 'magasin' in locals() and magasin else None,
            "ligne": ligne,
            "colonne": colonne,
            "stock": boite.nbBoite if boite else 0,
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

async def simulation_apport_boites():
    """Augmente le stock de 1 pour toutes les boîtes toutes les 2 minutes"""
    while True:
        await asyncio.sleep(120)
        print("[STOCK] Lancement simulation réapprovisionnement...")
        requetes.incrementer_stock_global()
        print("[STOCK] Stock incrémenté (+1) pour toutes les boîtes.")

# --- Démarrage serveur ---
@app.on_event("startup")
async def startup_event():
    logging.info("Initialisation de la base de données...")
    init_db()
    data_db()

    asyncio.create_task(simulation_apport_boites())
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

# --- backend/server.py ---
@app.get("/api/admin/dashboard")
def get_admin_dashboard():
    db = SessionLocal()
    try:
        stands = db.query(Stand).all()
        stands_map = {s.idStand: s.nomStand for s in stands}

        cycles = db.query(Cycle).all()
        
        if not cycles:
             return {"stands": [{"id": s.idStand, "nom": s.nomStand} for s in stands], "historique": []}

        commandes = db.query(Commande).order_by(Commande.dateCommande.desc()).all()
        
        now = datetime.now().replace(tzinfo=None)

        grouped_history = {} 

        for c in commandes:
            cycle_id = None
            if c.dateCommande and cycles:
                cmd_date = c.dateCommande.replace(tzinfo=None) if c.dateCommande.tzinfo else c.dateCommande
                
                for cy in cycles:
                    debut = cy.date_debut.replace(tzinfo=None) if cy.date_debut else None
                    fin = cy.date_fin.replace(tzinfo=None) if cy.date_fin else now
                    
                    if debut and debut <= cmd_date <= fin:
                        cycle_id = cy.date_debut.strftime("%Y-%m-%d %H:%M:%S")
                        break

            nom_objet = "Objet Inconnu"
            if c.boite:
                if c.boite.piece: nom_objet = c.boite.piece.nomPiece
                elif c.boite.code_barre: nom_objet = c.boite.code_barre

            if c.dateCommande:
                heure_str = c.dateCommande.strftime("%H:%M")
                date_complete = c.dateCommande.strftime("%d/%m %H:%M")
                raw_date = c.dateCommande
            else:
                heure_str, date_complete = "--:--", "--"
                raw_date = datetime.min
            
            key = (nom_objet, c.idMagasin, c.idPoste, c.statutCommande, cycle_id)
            
            if key in grouped_history:
                grouped_history[key]["count"] += 1
                if raw_date > grouped_history[key]["raw_date"]:
                     grouped_history[key]["raw_date"] = raw_date
                     grouped_history[key]["date_full"] = date_complete
            else:
                grouped_history[key] = {
                    "count": 1,
                    "raw_date": raw_date,
                    "id": c.idCommande,
                    "objet": nom_objet,
                    "statut": c.statutCommande,
                    "heure": heure_str,         
                    "date_full": date_complete,
                    "cycle_id": cycle_id,
                    "source_id": c.idMagasin,
                    "source_nom": stands_map.get(c.idMagasin, "Inconnu"),
                    "dest_id": c.idPoste,
                    "dest_nom": stands_map.get(c.idPoste, "Inconnu"),
                }

        historique_fmt = []
        for item in grouped_history.values():
            del item["raw_date"]
            historique_fmt.append(item)
            
        historique_fmt.sort(key=lambda x: x["date_full"], reverse=True)

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
                    label = f"{start_str} (En cours)"
                
                cycles_fmt.append({"id": cycle_id, "label": label})
        return cycles_fmt
    except Exception as e:
        print(f"Erreur Cycles: {e}")
        return []
    finally:
        db.close()


@app.get("/api/admin/logs/{cycle_id}")
def get_cycle_logs(cycle_id: str):
    try:
        if cycle_id == "Total":
            return {"logs": []}
        
        date_obj = datetime.strptime(cycle_id, "%Y-%m-%d %H:%M:%S")
        logs = requetes.get_commandes_cycle_logs(date_obj)
        return {"logs": logs}
    except Exception as e:
        print(f"Erreur Logs Route: {e}")
        return {"logs": [f"Erreur: {str(e)}"]}

@app.post("/api/cycle/start")
def start_cycle():
    """Démarre un nouveau cycle si aucun n'est actif"""
    db = SessionLocal()
    print("DB URL =", db.bind.url)
    try:
        actif = db.query(Cycle).filter(Cycle.date_fin == None).first()
        if actif:
            return {"status": "error", "message": "Un cycle est déjà en cours"}
        
        nouveau = Cycle(date_debut=datetime.now())
        db.add(nouveau)
        db.commit()
        print(f"[CYCLE] Démarré à {nouveau.date_debut}")
        return {"status": "ok", "date_debut": nouveau.date_debut}
    finally:
        db.close()

@app.post("/api/cycle/stop")
def stop_cycle():
    """Arrête le cycle en cours"""
    db = SessionLocal()
    print("DB URL =", db.bind.url)
    try:
        actif = db.query(Cycle).filter(Cycle.date_fin == None).first()
        if not actif:
            return {"status": "error", "message": "Aucun cycle actif"}
        
        actif.date_fin = datetime.now()
        db.commit()
        print(f"[CYCLE] Arrêté à {actif.date_fin}")
        return {"status": "ok"}
    finally:
        db.close()

@app.get("/api/cycles")
def api_get_cycles():
    """Récupère l'historique de tous les cycles"""
    cycles = requetes.get_all_cycles()
    
    return [
        {
            "idCycle": c.idCycle,
            "date_debut": c.date_debut,
            "date_fin": c.date_fin
        }
        for c in cycles
    ]

@app.get("/api/commandes/en_cours")
def get_commandes_en_cours():
    db = SessionLocal()
    try:
        commandes = db.query(Commande).filter(Commande.statutCommande != "Commande finie",
                                            Commande.statutCommande != "Annulée" 
        ).all()
        
        taches = []
        for c in commandes:
            stock = c.boite.nbBoite if c.boite else 0
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
                "stock": stock,
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
            
        print(f"[STATUT] {resultat['message']}")
        
        if "commande" in resultat:
            return {"status": "ok", "nouveau_statut": resultat["commande"]["nouveau_statut"]}
        else:
            return {"status": "ok", "message": resultat["message"]}

    except Exception as e:
        print(f"Erreur serveur update statut: {e}")
        raise HTTPException(status_code=500, detail=str(e))
 
@app.get("/api/stands")
def get_stands():
    """Récupère la liste de tous les stands (Postes et Magasins)"""
    db = SessionLocal()
    try:
        stands = db.query(Stand).all()
        # On renvoie un dictionnaire { id: "Nom" } pour faciliter l'usage côté Front
        return {str(s.idStand): s.nomStand for s in stands}
    except Exception as e:
        print(f"Erreur récupération stands: {e}")
        return {}
    finally:
        db.close()
    

@app.put("/api/commande/{id_commande}/manquant")
def set_commande_manquant(id_commande: int):
    try:
        succes = requetes.declarer_commande_manquante(id_commande)
        if not succes:
            raise HTTPException(status_code=404, detail="Commande introuvable")
            
        print(f"[MANQUANT] Commande {id_commande} marquée manquante")
        return {"status": "ok"}
    except Exception as e:
        print(f"Erreur manquant: {e}")

        
@app.delete("/api/commande/{id_commande}")
def delete_commande_endpoint(id_commande: int):
    try:
        succes = requetes.supprimer_commande(id_commande)
        
        if not succes:
            raise HTTPException(status_code=404, detail="Commande introuvable")
            
        print(f"[DELETE] Commande {id_commande} supprimée")
        return {"status": "ok", "message": f"Commande {id_commande} supprimée"}
        
    except Exception as e:
        print(f"Erreur suppression: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
class TrainPosUpdate(BaseModel):
    position: str

@app.get("/api/train/position")
def get_train_position():
    pos = requetes.get_position_train()
    return {"position": pos}

@app.put("/api/train/position")
def update_train_position(update: TrainPosUpdate):
    try:
        nouvelle_pos = requetes.update_position_train(update.position)
        return {"status": "ok", "position": nouvelle_pos}
    except Exception as e:
        print(f"Erreur update train: {e}")
        raise HTTPException(status_code=500, detail=str(e))
