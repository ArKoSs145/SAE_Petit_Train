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
from update_grid import traiter_fichier_config
from contextlib import asynccontextmanager

update_signal = asyncio.Event()
logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("Initialisation de la base de données...")
    init_db()
    data_db()

    task = asyncio.create_task(simulation_apport_boites())
    logging.info("Base prête")
    
    yield
    
    logging.info("Arrêt du serveur...")
    task.cancel() 

app = FastAPI(lifespan=lifespan)

# --- Autoriser le front React ---
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.14:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

class ConfigPayload(BaseModel):
    posteId: int
    csv_content: str

@app.post("/api/admin/upload-config")
async def upload_config(payload: ConfigPayload):
    db = SessionLocal()
    try:
        # On appelle la fonction d'affichage
        return traiter_fichier_config(payload.csv_content, payload.posteId, db)
    finally:
        db.close()

@app.post("/scan")
async def recevoir_scan(request: Request, mode: str = "Normal"):
    data = await request.json()
    poste_id = data.get("poste")
    code_barre = data.get("code_barre")

    db = SessionLocal()
    try:
        boite = db.query(Boite).filter_by(code_barre=code_barre).first()
        current_stand = db.query(Stand).filter_by(idStand=poste_id).first()

        if not boite or not current_stand:
            raise HTTPException(status_code=404, detail="Objet ou Poste inconnu")

        if current_stand.categorie == 0: 
            if boite.idPoste is not None and boite.idPoste != poste_id:
                raise HTTPException(status_code=403, detail="Cet objet n'est pas affecté à ce poste")

        case_magasin = db.query(Case).filter_by(idBoite=boite.idBoite, idStand=boite.idMagasin).first()
        magasin_nom, ligne, colonne = (case_magasin.Stand.nomStand, case_magasin.ligne, case_magasin.colonne) if case_magasin else ("Non localisé", "-", "-")

        nouvelle_commande = Commande(idBoite=boite.idBoite, idMagasin=boite.idMagasin, idPoste=poste_id, statutCommande="A récupérer", typeCommande=mode)
        db.add(nouvelle_commande)
        db.commit()
        db.refresh(nouvelle_commande)
        
        message = {
            "id_commande": nouvelle_commande.idCommande, "mode": mode, "poste": poste_id, "code_barre": code_barre,
            "nom_piece": boite.piece.nomPiece if boite.piece else code_barre, "magasin": magasin_nom, "magasin_id": str(boite.idMagasin),
            "ligne": ligne, "colonne": colonne, "stock": boite.nbBoite, "timestamp": datetime.now().isoformat()
        }
        await manager.broadcast(json.dumps(message))
        return {"status": "ok", "detail": "scan enregistré"}

    except HTTPException as he:
        raise he # On laisse remonter l'erreur 404 ou 403 telle quelle
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


async def simulation_apport_boites():
    """
    Simulation optimisée : incrémente le stock selon le délai 'approvisionnement'
    défini en base de données pour chaque boîte.
    """
    timers = {} # Dictionnaire local : {id_boite: secondes_restantes}
    
    logging.info("[APPRO] Simulation d'approvisionnement démarrée.")

    while True:
        await asyncio.sleep(1) # Tick de 1 seconde
        
        # --- ÉTAPE 1 : GESTION DU SIGNAL (MISE À JOUR DÉLAIS) ---
        if update_signal.is_set():
            logging.info("[APPRO] Signal reçu : Synchronisation des nouveaux délais...")
            
            # On demande à requetes.py le nouveau délai pour chaque boîte suivie
            for bid in list(timers.keys()):
                nouveau_delai = requetes.get_approvisionnement_boite(bid)
                if nouveau_delai is not None:
                    # Si le nouveau délai est plus court que le temps restant, on ajuste
                    if timers[bid] > nouveau_delai:
                        timers[bid] = nouveau_delai
            
            update_signal.clear() # On baisse le flag
            logging.info("[APPRO] Synchronisation terminée.")

        # --- ÉTAPE 2 : DÉCOMPTE ET MISE À JOUR DU STOCK ---
        db_update_needed = False
        ids_finis = []

        # On parcourt les compteurs en mémoire
        for boite_id in list(timers.keys()):
            timers[boite_id] -= 1
            if timers[boite_id] <= 0:
                ids_finis.append(boite_id)
                db_update_needed = True

        # On n'ouvre la base de données QUE si nécessaire
        if db_update_needed or not timers:
            db = SessionLocal()
            try:
                # Récupération des boîtes pour incrémentation ou initialisation
                boites = db.query(Boite).all()
                
                for b in boites:
                    # Initialisation des nouvelles boîtes arrivées en BD
                    if b.idBoite not in timers:
                        timers[b.idBoite] = b.approvisionnement
                    
                    # Si le délai est expiré pour cette boîte
                    if b.idBoite in ids_finis:
                        b.nbBoite += 1 # Incrémentation du stock
                        timers[b.idBoite] = b.approvisionnement # Reset du compteur avec la valeur BD
                        
                        nom = b.piece.nomPiece if b.piece else b.code_barre
                        logging.info(f"[APPRO] +1 stock pour {nom} (ID:{b.idBoite})")

                db.commit() # Sauvegarde globale des stocks incrémentés
            except Exception as e:
                logging.error(f"[APPRO] Erreur lors de l'incrémentation : {e}")
                db.rollback()
            finally:
                db.close()


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

class MultiDelayUpdate(BaseModel):
    updates: List[dict] # Liste de {idBoite: int, delai: int}

@app.get("/api/admin/boites-delais")
def get_boites_delais():
    db = SessionLocal()
    try:
        boites = db.query(Boite).all()
        return [
            {
                "idBoite": b.idBoite,
                "code_barre": b.code_barre,
                "delai_actuel": b.approvisionnement, # On récupère le délai
                "nom_piece": b.piece.nomPiece if b.piece else "Sans nom"
            } for b in boites
        ]
    finally:
        db.close()



@app.post("/api/admin/update-delais-appro")
def update_delais_appro(payload: MultiDelayUpdate):
    try:
        for item in payload.updates:
            # Appel de votre fonction dans requetes.py
            requetes.update_approvisionnement_boite(item["idBoite"], item["delai"])
        
        update_signal.set() 
        
        return {"status": "ok", "message": "Délais mis à jour"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- backend/server.py ---
@app.get("/api/admin/dashboard")
def get_admin_dashboard(mode: str = "Normal"):
    db = SessionLocal()
    try:
        stands = db.query(Stand).all()
        stands_map = {s.idStand: s.nomStand for s in stands}

        cycles = db.query(Cycle).filter(Cycle.type_cycle == mode).all()
        
        if not cycles:
             return {"stands": [{"id": s.idStand, "nom": s.nomStand} for s in stands], "historique": []}

        commandes = db.query(Commande).filter(Commande.typeCommande == mode).order_by(Commande.dateCommande.desc()).all()
        
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
def get_cycles_list(mode: str = "Normal"): # On récupère le mode
    db = SessionLocal()
    try:
        # On filtre les cycles par le mode (Normal ou Personnalisé)
        cycles_db = db.query(Cycle).filter(Cycle.type_cycle == mode).order_by(Cycle.date_debut.desc()).limit(20).all()
        
        cycles_fmt = []
        for c in cycles_db:
            if c.date_debut:
                cycle_id = c.date_debut.strftime("%Y-%m-%d %H:%M:%S")
                start_str = c.date_debut.strftime("%d/%m à %Hh%M")
                
                # On prépare le label
                if c.date_fin:
                    end_str = c.date_fin.strftime("%Hh%M")
                    label = f"{start_str} - {end_str}"
                else:
                    label = f"{start_str} (En cours)"
                
                # Si c'est personnalisé, on peut même l'ajouter au label ici pour l'admin
                if mode == "Personnalisé":
                    label += " (Personnalisé)"
                
                cycles_fmt.append({"id": cycle_id, "label": label})
        return cycles_fmt
    except Exception as e:
        print(f"Erreur Cycles: {e}")
        return []
    finally:
        db.close()


@app.get("/api/admin/logs/{cycle_id}")
def get_cycle_logs(cycle_id: str, mode: str = "Normal"):
    try:
        if cycle_id == "Total":
            return {"logs": []}
        
        # On convertit l'ID en date
        date_obj = datetime.strptime(cycle_id, "%Y-%m-%d %H:%M:%S")
        
        # On appelle la fonction de requetes en passant le mode
        logs = requetes.get_commandes_cycle_logs(date_obj, mode=mode)
        return {"logs": logs}
    except Exception as e:
        print(f"Erreur Logs: {e}")
        return {"logs": []}

@app.post("/api/cycle/start")
def start_cycle(mode: str = "Normal"):
    db = SessionLocal()
    try:
        # On vérifie s'il y a déjà un cycle actif pour le mode précis
        actif = db.query(Cycle).filter(Cycle.date_fin == None, Cycle.type_cycle == mode).first()
        if actif:
            return {"status": "error", "message": f"Un cycle {mode} est déjà en cours"}
        
        nouveau = Cycle(
            date_debut=datetime.now(),
            type_cycle=mode
        )
        db.add(nouveau)
        db.commit()
        return {"status": "ok", "date_debut": nouveau.date_debut}
    finally:
        db.close()

@app.post("/api/cycle/stop")
def stop_cycle():
    db = SessionLocal()
    try:
        # On cherche n'importe quel cycle qui n'a pas de date_fin
        actif = db.query(Cycle).filter(Cycle.date_fin == None).first()
        if not actif:
            return {"status": "error", "message": "Aucun cycle actif"}
        
        actif.date_fin = datetime.now()
        db.commit()
        return {"status": "ok"}
    finally:
        db.close()

@app.get("/api/cycles")
def api_get_cycles(mode: str = "Normal"): # On récupère le mode
    """Récupère l'historique de tous les cycles filtrés par mode"""
    cycles = requetes.get_all_cycles(mode=mode)
    
    return [
        {
            "idCycle": c.idCycle,
            "date_debut": c.date_debut,
            "date_fin": c.date_fin,
            "type_cycle": c.type_cycle
        }
        for c in cycles
    ]

@app.get("/api/commandes/en_cours")
def get_commandes_en_cours(mode: str = "Normal"): # On récupère le mode du fetch
    db = SessionLocal()
    try:
        #On ajoute le filtre sur le type de commande (Normal ou Personnalisé)
        commandes = db.query(Commande).filter(
            Commande.statutCommande != "Commande finie",
            Commande.statutCommande != "Annulée",
            Commande.typeCommande == mode
        ).all()
        
        taches = []
        for c in commandes:
            stock = c.boite.nbBoite if c.boite else 0
            
            # Récupération du code-barre
            vrai_code_barre = c.boite.code_barre if c.boite else "Inconnu"
            
            # Récupération du nom de la pièce
            nom_piece = "Inconnu"
            if c.boite and c.boite.piece:
                nom_piece = c.boite.piece.nomPiece
            else:
                nom_piece = vrai_code_barre

            ligne, colonne = 1, 1
            if c.boite and c.boite.Cases:
                case = c.boite.Cases[0]
                ligne = case.ligne
                colonne = case.colonne

            taches.append({
                "id": c.idCommande,
                "poste": str(c.idPoste),
                "magasin_id": str(c.idMagasin) if c.idMagasin else "7",
                "code_barre": vrai_code_barre,
                "nom_piece": nom_piece,
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
        
        if resultat.get("status") == "error":
            raise HTTPException(status_code=404, detail=resultat.get("message", "Commande introuvable"))
            
        return {"status": "ok", "nouveau_statut": resultat["commande"]["nouveau_statut"]}

    except HTTPException as he:
        raise he # Empêche le bloc Exception de transformer la 404 en 500
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
        return {"status": "ok"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Erreur manquant: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
@app.delete("/api/commande/{id_commande}")
def delete_commande_endpoint(id_commande: int):
    try:
        succes = requetes.supprimer_commande(id_commande)
        if not succes:
            raise HTTPException(status_code=404, detail="Commande introuvable")
            
        return {"status": "ok", "message": f"Commande {id_commande} supprimée"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Erreur suppression: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
class TrainPosUpdate(BaseModel):
    position: str

@app.get("/api/train/position")
def get_train_position(mode: str = "Normal"):
    pos = requetes.get_position_train(mode=mode)
    return {"position": pos}

@app.put("/api/train/position")
def update_train_position(update: TrainPosUpdate, mode: str = "Normal"): # On ajoute mode ici
    try:
        # On passe update.position ET le mode à ta fonction de requête
        nouvelle_pos = requetes.update_position_train(update.position, mode=mode)
        return {"status": "ok", "position": nouvelle_pos}
    except Exception as e:
        print(f"Erreur update train: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/admin/clear")
async def clear_database_endpoint():
    try:
        success = requetes.clear_production_data()
        if not success:
            raise HTTPException(status_code=500, detail="Erreur technique lors du vidage")
        return {"status": "ok", "message": "La base de données de production a été vidée."}
            
    except Exception as e:
        logging.error(f"Erreur lors de l'appel clear_database: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class CustomOrderPayload(BaseModel):
    idBoite: int
    idPoste: int  # FastAPI attend cet entier
    statut: str

@app.post("/api/admin/custom-order")
def post_custom_order(payload: CustomOrderPayload):
    # On appelle la fonction de requetes.py
    res = requetes.creer_commande_personnalisee(
        payload.idBoite, 
        payload.idPoste, 
        payload.statut
    )
    if not res:
        raise HTTPException(status_code=400, detail="Erreur lors de la création")
    return {"status": "ok"}

@app.get("/api/admin/stocks")
def get_admin_stocks():
    """Route appelée par le Frontend pour remplir la liste des objets"""
    try:
        # On appelle la fonction de requetes.py
        data = requetes.get_stocks_disponibles()
        return data
    except Exception as e:
        print(f"Erreur dans la route admin/stocks: {e}")
        return []
    
@app.delete("/api/admin/custom-order/all")
def clear_custom_orders():
    if requetes.supprimer_commandes_personnalisees():
        return {"status": "ok"}
    raise HTTPException(status_code=500, detail="Erreur lors du vidage")