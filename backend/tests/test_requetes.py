import pytest
from datetime import datetime, timedelta, timezone
from database import (
    SessionLocal, init_db, data_db, 
    Boite, Piece, Commande, Cycle, Train, Stand, Case, Login, reset_db
)
import requetes

@pytest.fixture(scope="function")
def db_session():
    """Prépare une base propre avec les stands nécessaires avant CHAQUE test."""
    reset_db()
    db = SessionLocal()
    # On crée les stands de 1 à 7 pour éviter les IndexError du Train
    for i in range(1, 8):
        requetes.create_stand(f"Poste {i}")
    yield db
    db.close()

# --- 1. TESTS DES "GET ALL" (Ciblage des lignes simples) ---

def test_get_all_functions(db_session):
    """Couvre les fonctions get_all_... qui sont souvent oubliées."""
    requetes.create_piece("TestPiece")
    requetes.create_user("testuser", "pass", "test@test.fr")
    
    assert len(requetes.get_all_stands()) >= 7
    assert len(requetes.get_all_pieces()) >= 1
    assert len(requetes.get_all_users()) >= 1
    assert isinstance(requetes.get_all_boites(), list)
    

# --- TESTS PIÈCES ET BOÎTES ---

def test_pieces_and_stocks(db_session): # Ajout de db_session
    """Teste la création de pièces, boîtes et la gestion du stock."""
    p = requetes.create_piece("Moteur", "Moteur test")
    assert p.idPiece is not None
    
    b = requetes.create_boite(p.idPiece, "CB-999", 10)
    assert b.nbBoite == 10
    
    # Test incrémentation globale
    requetes.incrementer_stock_global()
    assert requetes.get_boite_by_id(b.idBoite).nbBoite == 11
    
    # Test approvisionnement (le délai)
    requetes.update_approvisionnement_boite(b.idBoite, 450)
    assert requetes.get_approvisionnement_boite(b.idBoite) == 450

# --- TESTS COMMANDES (LOGIQUE PRINCIPALE) ---

def test_commande_flow(db_session): # Ajout de db_session ici
    """Teste le flux complet d'une commande (Récupération -> Dépôt -> Fin)."""
    p = requetes.create_piece("Roue")
    b = requetes.create_boite(p.idPiece, "ROUE-01", 5)
    
    # On récupère le stand 1 créé par la fixture db_session
    s = requetes.get_stand_by_id(1)
    
    # 1. Création
    cmd = requetes.creer_commande_personnalisee(b.idBoite, s.idStand)
    assert cmd.statutCommande == "A récupérer"
    
    # 2. Passage à 'A déposer' (Vérifie la décrémentation du stock)
    requetes.changer_statut_commande(cmd.idCommande)
    assert requetes.get_boite_by_id(b.idBoite).nbBoite == 4
    
    # 3. Passage à 'Commande finie'
    res = requetes.changer_statut_commande(cmd.idCommande)
    assert res["commande"]["nouveau_statut"] == "Commande finie"
    
    # 4. Vérification commandes en cours
    assert len(requetes.get_commandes_en_cours(mode="Personnalisé")) == 0

def test_commandes_actions_annexes(db_session): # Ajout de db_session
    """Teste l'annulation et le signalement de produit manquant."""
    p = requetes.create_piece("Test")
    b = requetes.create_boite(p.idPiece, "T-01", 1)
    
    # On utilise le stand 1 créé par la fixture
    cmd = requetes.creer_commande_personnalisee(b.idBoite, 1)
    
    requetes.supprimer_commande(cmd.idCommande)
    assert len(requetes.get_commandes_en_cours("Personnalisé")) == 0
    
    cmd2 = requetes.creer_commande_personnalisee(b.idBoite, 2)
    requetes.declarer_commande_manquante(cmd2.idCommande)
    
    # Utilisation directe de la session pour vérification
    c = db_session.get(Commande, cmd2.idCommande)
    assert c.statutCommande == "Produit manquant"



def test_admin_and_reset(db_session): # Ajout de db_session
    """Teste la gestion des utilisateurs et le vidage de la base."""
    requetes.create_user("admin", "pass", "admin@test.com")
    assert requetes.get_user_by_username("admin") is not None
    
    # Test de remise à zéro
    requetes.clear_production_data()
    assert len(requetes.get_all_cycles("Normal")) == 0

def test_rotation_stands(db_session): # Ajout de db_session
    """Vérifie la logique de rotation avec les stands initialisés par la fixture."""
    # La fixture crée 7 stands, donc l'ID 3 existe bien
    commandes = requetes.get_commandes_depuis_stand(3, mode="Normal")
    assert isinstance(commandes, list)


def test_cases_management(db_session):
    """Version optimisée : teste la création, la lecture et la suppression des cases."""
    p = requetes.create_piece("Vis")
    b = requetes.create_boite(p.idPiece, "CB-CASE", 5)
    
    # Test assignation et vérification des coordonnées
    case = requetes.assigner_case(b.idBoite, 1, ligne=1, colonne=2)
    assert case.ligne == 1
    
    # Test récupération croisée (par Stand et par Boîte)
    assert len(requetes.get_cases_dun_stand(1)) == 1
    assert len(requetes.get_cases_dune_boite(b.idBoite)) == 1
    
    # Test suppression et vérification de la mise à jour
    requetes.supprimer_case(case.idCase)
    assert len(requetes.get_cases_dun_stand(1)) == 0

# --- TESTS DES CYCLES ET HISTORIQUE ---
def test_cycles_detailed(db_session):
    now = datetime.now(timezone.utc)
    # Création manuelle d'un cycle fini pour tester get_commandes_cycle
    db = SessionLocal()
    cycle = Cycle(date_debut=now, date_fin=now, type_cycle="Normal")
    db.add(cycle)
    db.commit()
    
    # Test récupération
    cycles = requetes.get_all_cycles(mode="Normal")
    assert len(cycles) >= 1
    
    cmds_cycle = requetes.get_commandes_cycle(now, mode="Normal")
    assert isinstance(cmds_cycle, list)
    db.close()

# --- TESTS DES STOCKS ET PERSONNALISATION ---
def test_stocks_disponibles_logic(db_session):
    p = requetes.create_piece("Axe")
    requetes.create_boite(p.idPiece, "AXE-01", 10, idMagasin=5)
    
    stocks = requetes.get_stocks_disponibles()
    assert len(stocks) > 0
    assert any(s['nom'] == "Axe" for s in stocks)

def test_supprimer_commandes_personnalisees(db_session):
    p = requetes.create_piece("TestPerso")
    b = requetes.create_boite(p.idPiece, "P-01", 1)
    requetes.creer_commande_personnalisee(b.idBoite, 1)
    
    requetes.supprimer_commandes_personnalisees()
    assert len(requetes.get_commandes_en_cours(mode="Personnalisé")) == 0



def test_database_utilities(db_session):
    """Cible les fonctions de database.py pour monter le coverage à >90%."""

    # 1. Test de l'initialisation massive de données
    data_db() # Exécute toutes les boucles d'insertion de pièces/boîtes/stands
    db = SessionLocal()
    assert db.query(Piece).count() > 30 # Vérifie que data_db a travaillé
    db.close()
    
    # 2. Test de reset/drop (attention, cela vide la base de test)
    reset_db()
    init_db()

def test_train_full_logic(db_session):
    """
    Fusionne toute la logique du Train pour éliminer les doublons.
    Couvre : création, mise à jour, récupération et mouvements (database.py + requetes.py).
    """
    # 1. Test création si le train n'existe pas (branche 'if not train')
    pos_created = requetes.update_position_train(5, mode="ModeUnique")
    assert pos_created == 5
    
    # 2. Test mise à jour si le train existe déjà
    pos_updated = requetes.update_position_train(2, mode="ModeUnique")
    assert pos_updated == 2
    
    # 3. Test des getters (position seule et objet complet)
    assert requetes.get_position_train("ModeUnique") == 2
    train_obj = requetes.get_train_par_mode("ModeUnique")
    assert train_obj.statut_train == "ModeUnique"
    assert train_obj.position == 2
    assert requetes.get_position_train("Inexistant") is None

    # 4. Test des méthodes internes du modèle Train
    # Le constructeur utilise les stands 1 à 7 créés par la fixture
    t_model = Train(position=1, statut_train="Normal")
    assert t_model.get_position() == 1
    
    # Test move_forward (passage de l'ID 1 à l'ID 2 dans la liste ordonnée)
    new_pos = t_model.move_forward()
    assert new_pos == 2

def test_all_error_and_edge_cases(db_session):
    """
    Fusionne test_error_branches, test_requetes_edge_cases et test_requetes_missing_logic.
    Garantit le coverage des retours False, None ou Error de requetes.py.
    """
    # --- 1. Train et Modes ---
    # Branche 'if not train' : crée un train s'il n'existe pas
    assert requetes.update_position_train(7, mode="Inexistant") == 7
    assert requetes.get_position_train("ModeInconnu") is None

    # --- 2. IDs Inexistants (9999) ---
    # Récupération d'objets
    assert requetes.get_stand_by_id(9999) is None
    assert requetes.get_piece_by_id(9999) is None
    assert requetes.get_boite_by_id(9999) is None
    
    # Approvisionnement
    assert requetes.update_approvisionnement_boite(9999, 100) is False
    assert requetes.get_approvisionnement_boite(9999) is None

    # --- 3. Commandes et Flux ---
    # Actions sur commandes inexistantes
    assert requetes.supprimer_commande(9999) is False
    assert requetes.declarer_commande_manquante(9999) is False
    assert requetes.changer_statut_commande(9999)["status"] == "error"
    
    # Création et listes
    assert requetes.creer_commande_personnalisee(9999, 1) is None
    assert requetes.get_commandes_depuis_stand(9999) == []
    assert requetes.get_commandes_stand(9999) == []

    # --- 4. Cases et Logs ---
    # Suppression case inexistante (doit passer sans erreur)
    requetes.supprimer_case(9999)
    
    # Branche 'if not cycle'
    date_nulle = datetime(1900, 1, 1)
    assert "Cycle introuvable" in requetes.get_commandes_cycle_logs(date_nulle)[0]
    assert requetes.get_commandes_cycle(date_nulle) == []

    # --- 5. Global ---
    # Test de la branche try/except de l'incrémentation
    assert requetes.incrementer_stock_global() is True

def test_stats_and_logs_unified(db_session):
    """
    Fusionne test_get_commandes_cycle_logs_full, test_logs_and_stats et test_stats_with_data.
    Couvre les jointures SQL, les calculs de somme et tous les statuts de logs.
    """
    # 1. Préparation temporelle (arrondi à la seconde pour SQLite/SQLAlchemy)
    now = datetime.now().replace(microsecond=0)
    debut = now - timedelta(days=1)
    fin = now + timedelta(days=1)

    # 2. Création du Cycle et test "Base vide"
    db_session.add(Cycle(date_debut=now, type_cycle="Normal"))
    db_session.commit()
    
    # Vérifie que les logs gèrent le cas sans activité
    logs_vides = requetes.get_commandes_cycle_logs(now, mode="Normal")
    assert "Aucune activité" in logs_vides[0]

    # 3. Création de données réelles pour les calculs
    p = requetes.create_piece("Pignon", "Test Stat")
    b = requetes.create_boite(p.idPiece, "CB-STAT", 10, idMagasin=5)
    
    # Création d'une commande rattachée au cycle (mode Normal)
    cmd = requetes.creer_commande_personnalisee(b.idBoite, 1)
    db_session.query(Commande).filter_by(idCommande=cmd.idCommande).update({
        "typeCommande": "Normal", 
        "dateCommande": now
    })
    db_session.commit()
    
    # Progression de la commande pour déclencher les logs de retrait et livraison
    requetes.changer_statut_commande(cmd.idCommande) # A récupérer -> A déposer
    requetes.changer_statut_commande(cmd.idCommande) # A déposer -> Commande finie

    # 4. ASSERTIONS FINALES (Coverage de requetes.py)
    
    # Test des Statistiques (Jointures et Sommes SQL)
    res_postes = requetes.get_pieces_arrivees_postes(debut, fin)
    res_mags = requetes.get_boites_recuperees_magasins(debut, fin)
    
    assert len(res_postes) > 0
    assert res_postes[0]["nomPiece"] == "Pignon"
    assert res_mags[0]["quantite"] > 0

    # Test des Logs (Boucles de formatage et tris chronologiques)
    logs_actifs = requetes.get_commandes_cycle_logs(now, mode="Normal")
    assert any("Pignon" in l for l in logs_actifs)
    assert any("Livré" in l for l in logs_actifs)