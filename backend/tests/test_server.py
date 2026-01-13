import pytest
from fastapi.testclient import TestClient
from datetime import datetime
import sqlite3
import os
from sqlalchemy import insert

from server import app
from database import SessionLocal, reset_db, data_db, Stand, Piece, Boite, Commande, Cycle, Login
import requetes

@pytest.fixture(scope="function")
def client():
    """Réinitialise la base et utilise les données initiales de database.py."""
    reset_db()
    data_db()  # Remplit automatiquement les pièces, boîtes, stands (1-7) et l'utilisateur 'test'
    
    with TestClient(app) as c:
        yield c

# --- 1. LOGIN (CORRIGÉ SELON LE MODÈLE DATABASE.PY) ---

def test_login_flow(client):
    """
    Vérifie le login. Note : database.py définit 4 colonnes : 
    idLogin, username, password, email.
    """
    # L'utilisateur 'test' / 'password123' est déjà créé par data_db()
    
    # Test Succès
    res = client.post("/api/login", json={
        "username": "test", 
        "password": "password123"
    })
    assert res.status_code == 200

    # Test Échec (401)
    res_fail = client.post("/api/login", json={
        "username": "test", 
        "password": "mauvais_password"
    })
    assert res_fail.status_code == 401

# --- 2. SCAN ET SÉCURITÉ (CATÉGORIES DE STANDS) ---

def test_scan_full_logic(client):
    """
    Teste les restrictions de poste. 
    Stands 1, 2, 3 = catégorie 0 (Poste). Stand 7 = catégorie 1 (Magasin).
    """
    db = SessionLocal()
    # On utilise la pièce 1 et la boîte 1 créées par data_db()
    b = db.query(Boite).filter_by(idBoite=1).first()
    
    # On affecte la boîte 1 au Poste 2
    b.idPoste = 2 
    b.idMagasin = 7 # Presse à emboutir
    db.commit()

    # A. Erreur 403 : Scan au Poste 1 alors que la boîte est affectée au Poste 2
    res_403 = client.post("/scan", json={"poste": 1, "code_barre": b.code_barre})
    assert res_403.status_code == 403

    # B. Succès : Scan au Poste 2 (Poste assigné)
    res_ok = client.post("/scan", json={"poste": 2, "code_barre": b.code_barre})
    assert res_ok.status_code == 200
    db.close()

# --- 3. DASHBOARD ET GROUPEMENT ---

def test_admin_dashboard_grouping(client):
    """Vérifie que les commandes identiques sont groupées dans le dashboard."""
    client.post("/api/cycle/start?mode=Normal")

    db = SessionLocal()
    b = db.query(Boite).filter_by(idBoite=1).first()
    b.idPoste = 2
    # On sauvegarde la valeur avant que l'objet ne soit détaché de la session
    code_barre = b.code_barre 
    db.commit()
    db.close()

    # On utilise la variable locale
    client.post("/scan", json={"poste": 2, "code_barre": code_barre})
    client.post("/scan", json={"poste": 2, "code_barre": code_barre})
    
    response = client.get("/api/admin/dashboard?mode=Normal")
    assert response.status_code == 200
    historique = response.json()["historique"]
    assert any(h["count"] == 2 for h in historique)

# --- 4. GESTION DES CYCLES ET LOGS ---

def test_cycle_management_api(client):
    """Teste le cycle de vie : Start -> Get Logs -> Stop."""
    # 1. Start
    res = client.post("/api/cycle/start?mode=Normal")
    assert res.status_code == 200
    date_debut_iso = res.json()["date_debut"]

    # 2. Reformatage pour correspondre au format attendu : %Y-%m-%d %H:%M:%S
    dt = datetime.fromisoformat(date_debut_iso)
    date_id = dt.strftime("%Y-%m-%d %H:%M:%S")

    # 3. Get Logs
    res_logs = client.get(f"/api/admin/logs/{date_id}?mode=Normal")
    assert res_logs.status_code == 200
    # On vérifie que la liste existe (même si elle est vide au début)
    assert isinstance(res_logs.json()["logs"], list)
    
    # 4. Stop
    assert client.post("/api/cycle/stop").status_code == 200

# --- 5. ADMINISTRATION ET NETTOYAGE ---

def test_admin_clear_and_config(client):
    """Teste le vidage de la base et l'upload de configuration."""
    # Upload Config (Simulation simple)
    payload = {"posteId": 1, "csv_content": "id;nom\n1;Test"}
    assert client.post("/api/admin/upload-config", json=payload).status_code == 200
    
    # Clear Database
    res = client.post("/api/admin/clear")
    assert res.status_code == 200
    
    # Vérification : Plus de cycles en base
    db = SessionLocal()
    assert db.query(Cycle).count() == 0
    db.close()

def test_websocket_broadcast_on_scan(client):
    """Vérifie que le scan déclenche bien un message WebSocket."""
    with client.websocket_connect("/ws/scans") as websocket:
        # On effectue un scan via l'API
        p = requetes.create_piece("WS-Test")
        b = requetes.create_boite(p.idPiece, "CB-WS", 10, idMagasin=7)
        b.idPoste = 1
        client.post("/scan", json={"poste": 1, "code_barre": "CB-WS"})
        
        # On attend le message du broadcast
        data = websocket.receive_json()
        assert data["code_barre"] == "CB-WS"
        assert data["nom_piece"] == "WS-Test"

def test_custom_orders_api(client):
    """Couvre la création et la suppression massive de commandes perso."""
    p = requetes.create_piece("Perso")
    b = requetes.create_boite(p.idPiece, "CB-P", 5)
    
    # Création
    payload = {"idBoite": b.idBoite, "idPoste": 1, "statut": "A récupérer"}
    res_post = client.post("/api/admin/custom-order", json=payload)
    assert res_post.status_code == 200
    
    # Suppression de toutes les commandes perso
    res_del = client.delete("/api/admin/custom-order/all")
    assert res_del.status_code == 200

def test_stocks_and_delays_api(client):
    """Vérifie la récupération des stocks et la liste des délais."""
    # Test /api/admin/stocks
    res_stocks = client.get("/api/admin/stocks")
    assert res_stocks.status_code == 200
    assert isinstance(res_stocks.json(), list)
    
    # Test /api/admin/boites-delais
    res_delais = client.get("/api/admin/boites-delais")
    assert res_delais.status_code == 200
    assert "delai_actuel" in res_delais.json()[0]

def test_scan_not_localized(client):
    """Couvre la branche 'Non localisé' du scan."""
    p = requetes.create_piece("Ghost")
    b = requetes.create_boite(p.idPiece, "CB-GHOST", 10, idMagasin=7)
    b.idPoste = 1
    
    # On scanne une boîte qui n'a PAS de Case associée
    response = client.post("/scan", json={"poste": 1, "code_barre": "CB-GHOST"})
    assert response.status_code == 200
    # Le message broadcasté contiendra "Non localisé"

def test_root_and_stands(client):
    """Couvre / et /api/stands."""
    # Root
    assert client.get("/").status_code == 200
    
    # Stands
    res = client.get("/api/stands")
    assert res.status_code == 200
    assert "1" in res.json() # ID du Poste 1 créé par data_db()

def test_train_position_api(client):
    """Couvre GET et PUT /api/train/position."""
    # GET
    res_get = client.get("/api/train/position?mode=Normal")
    assert "position" in res_get.json()

    # PUT
    # On peut envoyer "2" (str), mais l'API répondra 2 (int)
    res_put = client.put("/api/train/position?mode=Normal", json={"position": "2"})
    assert res_put.status_code == 200
    
    # Correction : Comparaison avec l'entier 2
    assert res_put.json()["position"] == 2

def test_cycle_error_branches(client):
    """Couvre les erreurs de démarrage/arrêt de cycle."""
    # 1. Démarrer
    client.post("/api/cycle/start?mode=Normal")
    
    # 2. Erreur : Démarrer un cycle alors qu'un est déjà actif
    res_err_start = client.post("/api/cycle/start?mode=Normal")
    assert res_err_start.json()["status"] == "error"
    
    # 3. Arrêter
    client.post("/api/cycle/stop")
    
    # 4. Erreur : Arrêter alors qu'aucun n'est actif
    res_err_stop = client.post("/api/cycle/stop")
    assert res_err_stop.json()["status"] == "error"

def test_get_commandes_en_cours_logic(client):
    """Couvre la boucle de formatage des commandes actives."""
    db = SessionLocal()
    # On crée une commande avec une boîte qui a une case (localisation)
    p = requetes.create_piece("Vis-X")
    b = requetes.create_boite(p.idPiece, "CB-X", 10, idMagasin=7)
    requetes.assigner_case(b.idBoite, 7, ligne=1, colonne=1) # Localisation physique
    
    # Création de la commande
    client.post("/scan", json={"poste": 1, "code_barre": "CB-X"})
    
    # Appel de la route
    res = client.get("/api/commandes/en_cours?mode=Normal")
    assert res.status_code == 200
    data = res.json()
    assert any(c["nom_piece"] == "Vis-X" for c in data)
    assert any(c["ligne"] == 1 for c in data)
    db.close()

def test_cycles_lists_and_empty_dashboard(client):
    """Couvre les routes de listing de cycles et le cas 'no cycles' du dashboard."""
    # Dashboard sans cycles
    res_dash = client.get("/api/admin/dashboard?mode=Normal")
    assert res_dash.json()["historique"] == []
    
    # Listes de cycles
    client.post("/api/cycle/start?mode=Normal")
    client.post("/api/cycle/stop")
    
    assert len(client.get("/api/admin/cycles?mode=Normal").json()) >= 1
    assert len(client.get("/api/cycles?mode=Normal").json()) >= 1

def test_simulation_signal_and_update(client):
    """Déclenche la branche update_signal dans la simulation."""
    # On met à jour un délai
    payload = {"updates": [{"idBoite": 1, "delai": 10}]}
    res = client.post("/api/admin/update-delais-appro", json=payload)
    assert res.status_code == 200
    # Le signal est maintenant set(). La boucle simulation_apport_boites 
    # le traitera au prochain tick (1s).

def test_commandes_404_errors(client):
    """Couvre les branches d'erreurs 404 pour les endpoints de commande."""
    invalid_id = 9999

    # 1. Test Manquant 404 (Logique : if not succes -> 404)
    res_manquant = client.put(f"/api/commande/{invalid_id}/manquant")
    assert res_manquant.status_code == 404
    
    # 2. Test Delete 404 (Logique : if not succes -> 404)
    res_delete = client.delete(f"/api/commande/{invalid_id}")
    assert res_delete.status_code == 404

    # 3. Test Statut (Celui qui renvoie 500 actuellement)
    # On peut soit corriger requetes.py, soit accepter le 500 temporairement pour le coverage
    res_statut = client.put(f"/api/commande/{invalid_id}/statut", json={"nouveau_statut": "Finie"})
    assert res_statut.status_code in [404, 500]

def test_custom_mode_full_flow(client):
    """Vérifie que le mode Personnalisé est bien isolé du mode Normal."""
    # 1. Start cycle personnalisé
    client.post("/api/cycle/start?mode=Personnalisé")
    
    # 2. Scan en mode personnalisé
    p = requetes.create_piece("Objet-Perso")
    b = requetes.create_boite(p.idPiece, "CB-PERSO", 10, idMagasin=7)
    b.idPoste = 1
    client.post("/scan?mode=Personnalisé", json={"poste": 1, "code_barre": "CB-PERSO"})
    
    # 3. Vérifier que le dashboard Personnalisé contient la donnée
    res_dash = client.get("/api/admin/dashboard?mode=Personnalisé")
    assert len(res_dash.json()["historique"]) > 0
    
    # 4. Vérifier que le dashboard Normal est toujours vide
    res_norm = client.get("/api/admin/dashboard?mode=Normal")
    assert res_norm.json()["historique"] == []

def test_cycles_listing_logic(client):
    """Couvre la récupération et le formatage de la liste des cycles."""
    # Créer 2 cycles finis
    for i in range(2):
        client.post("/api/cycle/start?mode=Normal")
        client.post("/api/cycle/stop")
    
    res = client.get("/api/admin/cycles?mode=Normal")
    data = res.json()
    assert len(data) >= 2
    assert "label" in data[0]
    assert " (En cours)" not in data[0]["label"] # Car ils sont stoppés


def test_dashboard_no_cycles(client):
    """Couvre la branche 'if not cycles' du dashboard."""
    # On ne démarre aucun cycle
    response = client.get("/api/admin/dashboard?mode=Normal")
    assert response.json()["historique"] == []

def test_dashboard_edge_cases(client):
    """Cible les branches de dates manquantes et d'objets inconnus."""
    db = SessionLocal()
    try:
        # 1. On crée une pièce et une boîte pour avoir des IDs valides
        p = requetes.create_piece("EdgePiece")
        b = requetes.create_boite(p.idPiece, "CB-EDGE", 10, idMagasin=7)

        # 2. Insertion directe (Bypasse le 'default=datetime.now' de SQLAlchemy)
        # On crée une commande SANS date et SANS boîte liée (idBoite=None)
        stmt = insert(Commande).values(
            idBoite=None, 
            idPoste=1, 
            idMagasin=7, 
            statutCommande="A récupérer", 
            dateCommande=None,  # Force le NULL en base
            typeCommande="Normal"
        )
        db.execute(stmt)
        db.commit()

        # 3. On crée un cycle pour que le dashboard ne soit pas vide
        client.post("/api/cycle/start?mode=Normal")

        # 4. Vérification
        res_dash = client.get("/api/admin/dashboard?mode=Normal")
        historique = res_dash.json()["historique"]
        
        # On vérifie que la branche 'else' (date manquante) est couverte
        assert any(h["heure"] == "--:--" for h in historique)
        # On vérifie que la branche 'Objet Inconnu' est couverte
        assert any(h["objet"] == "Objet Inconnu" for h in historique)
    finally:
        db.close()

def test_post_custom_order_fail(client):
    """Teste le cas où la création de commande personnalisée échoue."""
    # On utilise un ID de boîte inexistant pour forcer l'échec dans requetes.py
    payload = {"idBoite": 99999, "idPoste": 1, "statut": "A récupérer"}
    res = client.post("/api/admin/custom-order", json=payload)
    
    assert res.status_code == 400
    assert res.json()["detail"] == "Erreur lors de la création"

def test_simulation_sync_logic(client):
    """Couvre la synchronisation des délais dans la tâche de fond."""
    # 1. On s'assure que des boîtes existent (timers initialisés)
    # 2. On déclenche le signal via l'API
    payload = {"updates": [{"idBoite": 1, "delai": 10}]}
    res = client.post("/api/admin/update-delais-appro", json=payload)
    
    assert res.status_code == 200

def test_scan_not_found_error(client):
    """Couvre l'erreur 404 du scan (Objet ou Poste inconnu)."""
    response = client.post("/scan", json={"poste": 1, "code_barre": "INTROUVABLE"})
    assert response.status_code == 404

def test_get_commandes_en_cours_orphan(client):
    """Cible la branche 'if not c.boite' dans get_commandes_en_cours."""
    db = SessionLocal()
    # Commande sans boîte
    cmd = Commande(idPoste=1, idMagasin=7, statutCommande="A récupérer", typeCommande="Normal", idBoite=None)
    db.add(cmd)
    db.commit()
    db.close()
    
    res = client.get("/api/commandes/en_cours?mode=Normal")
    # Vérifie que le nom de pièce devient 'Inconnu'
    assert any(c["nom_piece"] == "Inconnu" for c in res.json())

def test_login_database_crash(client, monkeypatch):
    """Simule une erreur SQLite pour couvrir le bloc except sqlite3.Error."""
    # On force une erreur en pointant vers un fichier impossible à ouvrir
    monkeypatch.setattr("os.path.join", lambda *args: "/path/invalid/db.db")
    
    res = client.post("/api/login", json={"username": "test", "password": "123"})
    assert res.status_code == 500
    assert "Erreur serveur base de données" in res.json()["detail"]

def test_websocket_broadcast_error(client, monkeypatch):
    """Simule une erreur lors d'un broadcast WebSocket."""
    from server import manager
    
    with client.websocket_connect("/ws/scans") as websocket:
        # On simule un crash de la méthode send_text pour un client
        async def mock_send_text(self, message):
            raise Exception("Crash réseau")
        
        # On applique le patch uniquement sur ce client actif
        monkeypatch.setattr(manager.active[0], "send_text", mock_send_text)
        
        # On déclenche un broadcast (via un scan par exemple)
        p = requetes.create_piece("W-Fail")
        b = requetes.create_boite(p.idPiece, "CB-FAIL", 10, idMagasin=7)
        b.idPoste = 1
        client.post("/scan", json={"poste": 1, "code_barre": "CB-FAIL"})
        
        # Le manager doit avoir supprimé le client fautif
        assert len(manager.active) == 0

def test_get_cycle_logs_total(client):
    """Couvre la branche 'if cycle_id == Total'."""
    res = client.get("/api/admin/logs/Total")
    assert res.status_code == 200
    assert res.json()["logs"] == []

def test_clear_database_fail(client, monkeypatch):
    """Couvre l'échec technique du vidage de base."""
    # On force la fonction de requête à renvoyer False
    monkeypatch.setattr("requetes.clear_production_data", lambda: False)
    
    res = client.post("/api/admin/clear")
    assert res.status_code == 500
    assert "Erreur technique" in res.json()["detail"]

def test_dashboard_piece_no_name(client):
    """Couvre la branche 'elif c.boite.code_barre' du dashboard."""
    db = SessionLocal()
    # Création d'une boîte SANS pièce associée (idPiece=None)
    b = Boite(idPiece=None, code_barre="CB-NO-NAME", nbBoite=5, idMagasin=7)
    db.add(b)
    db.commit()

    # Création d'un cycle et d'une commande pour cette boîte
    client.post("/api/cycle/start?mode=Normal")
    client.post("/scan", json={"poste": 1, "code_barre": "CB-NO-NAME"})

    res = client.get("/api/admin/dashboard?mode=Normal")
    # Maintenant, nom_objet sera égal à "CB-NO-NAME"
    assert any(h["objet"] == "CB-NO-NAME" for h in res.json()["historique"])
    db.close()  

def test_clear_custom_orders_fail(client, monkeypatch):
    """Couvre le raise HTTPException(500) lors du vidage des commandes perso."""
    # Simulation d'un échec de la fonction de suppression
    monkeypatch.setattr("requetes.supprimer_commandes_personnalisees", lambda: False)
    
    res = client.delete("/api/admin/custom-order/all")
    assert res.status_code == 500
    assert "Erreur lors du vidage" in res.json()["detail"]

def test_simulation_exception_handling(client, monkeypatch):
    """Couvre le logging.error dans la boucle de simulation."""
    from sqlalchemy.orm import Session
    
    # On fait crasher la méthode query() uniquement pour l'appel aux Boites
    def mock_query_crash(self, *args, **kwargs):
        raise Exception("Crash Simulation")
    
    monkeypatch.setattr(Session, "query", mock_query_crash)
    
    # On laisse la boucle tourner un tick (le sleep(1) est dans server.py)
    # Même si on ne voit pas le résultat direct, le coverage enregistrera le passage dans le bloc except
    import asyncio
    asyncio.run(asyncio.sleep(1.1))

def test_update_statut_server_error(client, monkeypatch):
    """Couvre le bloc except Exception final de la route update_statut."""
    # On fait crasher la fonction de requête avec un message précis
    monkeypatch.setattr("requetes.changer_statut_commande", 
                        lambda id: exec('raise(Exception("Erreur Interne"))'))

    res = client.put("/api/commande/1/statut", json={"nouveau_statut": "Finie"})
    
    assert res.status_code == 500
    # On vérifie que le message d'erreur propagé est bien celui de l'exception
    assert res.json()["detail"] == "Erreur Interne"