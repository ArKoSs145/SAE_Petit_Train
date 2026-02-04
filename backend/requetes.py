"""
Contient toutes les fonctions CRUD pour interagir avec la base SQLite via SQLAlchemy.
"""
from database import SessionLocal, Stand, Piece, Boite, Case, Commande, Login, Train, Cycle
from datetime import datetime, timezone
from sqlalchemy import func


# ---------- TRAIN ----------

def get_train_par_mode(mode="Normal"):
    """Récupère l'objet Train complet selon le mode (Normal ou Personnalisé)"""
    db = SessionLocal()
    try:
        # On filtre par le champ statut_train que vous avez ajouté en BD
        return db.query(Train).filter(Train.statut_train == mode).first()
    finally:
        db.close()

def get_position_train(mode="Normal"):
    """Récupère uniquement la position du train pour un mode donné"""
    db = SessionLocal()
    try:
        train = db.query(Train).filter(Train.statut_train == mode).first()
        return train.position if train else None
    finally:
        db.close()

def update_position_train(nouvelle_position: int, mode="Normal"):
    """Met à jour la position du train spécifié par son mode"""
    db = SessionLocal()
    try:
        # On cherche le train correspondant au mode actif
        train = db.query(Train).filter(Train.statut_train == mode).first()
        if not train:
            # Si pour une raison X il n'existe pas, on le crée
            train = Train(position=nouvelle_position, statut_train=mode)
            db.add(train)
        else:
            train.position = nouvelle_position
            
        db.commit()
        db.refresh(train)
        return train.position
    finally:
        db.close()

# ---------- STAND ----------
def create_stand(nom):
    """
    Crée un nouveau stand dans la base de données
    """
    db = SessionLocal()
    try:
        stand = Stand(nomStand=nom)
        db.add(stand)
        db.commit()
        db.refresh(stand)
        return stand
    finally:
        db.close()

def get_all_stands():
    """
    Récupère tous les stands
    """
    db = SessionLocal()
    try:
        return db.query(Stand).all()
    finally:
        db.close()

def get_stand_by_id(id_stand):
    """
    Récupère un stand par son ID
    """
    db = SessionLocal()
    try:
        return db.query(Stand).filter(Stand.idStand == id_stand).first()
    finally:
        db.close()

# ---------- PIECES ----------
def create_piece(nom, description=""):
    """
    Crée une nouvelle pièce
    """
    db = SessionLocal()
    try:
        piece = Piece(nomPiece=nom, description=description)
        db.add(piece)
        db.commit()
        db.refresh(piece)
        return piece
    finally:
        db.close()

def get_all_pieces():
    """
    Récupère toutes les pièces
    """
    db = SessionLocal()
    try:
        return db.query(Piece).all()
    finally:
        db.close()

def get_piece_by_id(id_piece):
    """
    Récupère une pièce par son ID
    """
    db = SessionLocal()
    try:
        return db.query(Piece).filter(Piece.idPiece == id_piece).first()
    finally:
        db.close()

# ---------- BOITES ----------
def create_boite(id_piece, code_barre, nbBoite, idMagasin=None):
    """
    Crée une nouvelle boîte de pièces
    """
    db = SessionLocal()
    try:
        boite = Boite(idPiece=id_piece, code_barre=code_barre, nbBoite=nbBoite, idMagasin=idMagasin)
        db.add(boite)
        db.commit()
        db.refresh(boite)
        return boite
    finally:
        db.close()

def get_boite_by_id(id_boite):
    """
    Récupère une boîte par son ID
    """
    db = SessionLocal()
    try:
        return db.query(Boite).filter(Boite.idBoite == id_boite).first()
    finally:
        db.close()

def get_all_boites():
    """
    Récupère toutes les boîtes
    """
    db = SessionLocal()
    try:
        return db.query(Boite).all()
    finally:
        db.close()

def incrementer_stock_global():
    """
    Incrémente le stock de toutes les boîtes de 1
    """
    db = SessionLocal()
    try:
        db.query(Boite).update({Boite.nbBoite: Boite.nbBoite + 1})
        db.commit()
        return True
    except Exception as e:
        print(f"Erreur incrémentation stock: {e}")
        return False
    finally:
        db.close()

# ---------- CASES ----------
def assigner_case(id_boite, id_stand, ligne, colonne):
    """
    Assigne une boîte à une case physique d'un stand
    """
    db = SessionLocal()
    try:
        case = Case(idBoite=id_boite, idStand=id_stand, ligne=ligne, colonne=colonne)
        db.add(case)
        db.commit()
        db.refresh(case)
        return case
    finally:
        db.close()

def get_cases_dun_stand(id_stand):
    """
    Récupère toutes les cases d'un stand spécifique
    """
    db = SessionLocal()
    try:
        return db.query(Case).filter(Case.idStand == id_stand).all()
    finally:
        db.close()

def get_cases_dune_boite(id_boite):
    """
    Récupère l'emplacement (la case) d'une boîte
    """
    db = SessionLocal()
    try:
        return db.query(Case).filter(Case.idBoite == id_boite).all()
    finally:
        db.close()

def supprimer_case(id_case):
    """
    Supprime une case de la base de données
    """
    db = SessionLocal()
    try:
        case = db.query(Case).filter(Case.idCase == id_case).first()
        if case:
            db.delete(case)
            db.commit()
    finally:
        db.close()

# ---------- COMMANDES ----------

def supprimer_commande(id_commande):
    """
    Annule une commande existante
    """
    db = SessionLocal()
    try:
        commande = db.query(Commande).filter(Commande.idCommande == id_commande).first()
        if not commande:
            return False
        commande.statutCommande = "Annulée"
        commande.date_livraison = datetime.now()
        db.commit()
        return True
    finally:
        db.close()

def declarer_commande_manquante(id_commande):
    """
    Marque une commande comme ayant un produit manquant
    """
    db = SessionLocal()
    try:
        commande = db.query(Commande).filter(Commande.idCommande == id_commande).first()
        if not commande:
            return False
        commande.statutCommande = "Produit manquant"
        commande.date_livraison = datetime.now() 
        db.commit()
        return True
    finally:
        db.close()
        
def changer_statut_commande(id_commande):
    """
    Fait progresser le statut d'une commande (Récupération -> Dépôt -> Finie)
    """
    db = SessionLocal()
    try:
        commande = db.query(Commande).filter(Commande.idCommande == id_commande).first()
        if not commande:
            return {"status": "error", "message": "Commande introuvable"}

        if commande.statutCommande == "A récupérer":
            commande.statutCommande = "A déposer"
            commande.date_recuperation = datetime.now() 
            if commande.idBoite:
                db.query(Boite).filter(Boite.idBoite == commande.idBoite).update(
                    {Boite.nbBoite: Boite.nbBoite - 1}, 
                    synchronize_session=False
                )
        elif commande.statutCommande == "A déposer":
            commande.statutCommande = "Commande finie"
            commande.date_livraison = datetime.now()
        else:
            return {"status": "no_change", "message": f"Statut inchangé : {commande.statutCommande}"}

        db.commit()
        db.refresh(commande)
        return {"status": "ok", "message": "OK", "commande": {"idCommande": commande.idCommande, "nouveau_statut": commande.statutCommande}}
    finally:
        db.close()

def get_commandes_depuis_stand(id_prochain, mode="Normal"):
    """
    Récupère les commandes à traiter à partir d'un stand donné
    """
    db = SessionLocal()
    try:
        stands = db.query(Stand).order_by(Stand.idStand.asc()).all()
        if not stands:
            return []

        ids = [s.idStand for s in stands]
        if id_prochain not in ids:
            return []

        index = ids.index(id_prochain)
        ordre_ids = ids[index:] + ids[:index]

        commandes = []
        for mid in ordre_ids:
            # AJOUT DU FILTRE mode ICI
            cmds = db.query(Commande).filter(
                Commande.idPoste == mid, 
                Commande.typeCommande == mode
            ).order_by(Commande.idCommande.asc()).all()
            commandes.extend(cmds)

        return commandes
    finally:
        db.close()

def get_commandes_stand(id_poste, mode="Normal"):
    """
    Récupère toutes les commandes liées à un poste spécifique
    """
    db = SessionLocal()
    try:
        # AJOUT DU FILTRE mode ICI
        return db.query(Commande).filter(
            Commande.idPoste == id_poste, 
            Commande.typeCommande == mode
        ).order_by(Commande.idCommande.asc()).all()
    finally:
        db.close()

def get_commandes_en_cours(mode="Normal"):
    db = SessionLocal()
    try:
        # On récupère toutes les commandes qui ne sont pas finies pour le mode actuel
        return db.query(Commande).filter(
            Commande.statutCommande != "Commande finie",
            Commande.statutCommande != "Annulée",
            Commande.typeCommande == mode
        ).all()
    finally:
        db.close()

# ---------- LOGIN ----------
def create_user(username, password, email):
    """
    Crée un nouvel utilisateur pour l'interface
    """
    db = SessionLocal()
    try:
        user = Login(username=username, password=password, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()

def get_user_by_username(username):
    """
    Récupère un utilisateur par son nom d'utilisateur
    """
    db = SessionLocal()
    try:
        return db.query(Login).filter(Login.username == username).first()
    finally:
        db.close()

def get_all_users():
    """
    Récupère la liste de tous les utilisateurs
    """
    db = SessionLocal()
    try:
        return db.query(Login).all()
    finally:
        db.close()

# ---------- STATS ----------
def get_pieces_arrivees_postes(debut, fin):
    """
    Récupère les statistiques des pièces livrées aux postes sur une période
    """
    db = SessionLocal()
    try:
        result = (
            db.query(
                Commande.idPoste,
                Piece.nomPiece, 
                func.sum(Boite.nbBoite).label("quantite")
            )
            .join(Boite, Boite.idBoite == Commande.idBoite)
            .join(Piece, Piece.idPiece == Boite.idPiece)
            .filter(
                Commande.statutCommande == "Commande finie",
                Commande.dateCommande >= debut,
                Commande.dateCommande <= fin
            )
            .group_by(Commande.idPoste, Piece.nomPiece)
            .all()
        )
        return [{"idPoste": r.idPoste, "nomPiece": r.nomPiece, "quantite": r.quantite} for r in result]
    finally:
        db.close()

def get_boites_recuperees_magasins(debut, fin):
    """
    Récupère les statistiques des boîtes sorties des magasins sur une période
    """
    db = SessionLocal()
    try:
        result = (
            db.query(
                Commande.idMagasin,          
                Piece.nomPiece,             
                func.sum(Boite.nbBoite).label("quantite") 
            )
            .join(Boite, Boite.idBoite == Commande.idBoite)
            .join(Piece, Piece.idPiece == Boite.idPiece)
            .filter(
                Commande.statutCommande == "Commande finie",
                Commande.dateCommande >= debut,
                Commande.dateCommande <= fin
            )
            .group_by(Commande.idMagasin, Piece.nomPiece)
            .all()
        )
        return [{"idMagasin": r.idMagasin, "nomPiece": r.nomPiece, "quantite": r.quantite} for r in result]
    finally:
        db.close()

# ---------- LOGS ----------
def get_commandes_cycle_logs(debut_cycle: datetime, mode="Normal"):
    """
    Génère les logs textuels d'activité pour un cycle spécifique
    """
    db = SessionLocal()
    try:
        target_id_str = debut_cycle.strftime('%Y-%m-%d %H:%M:%S')
        
        # On cherche le cycle correspondant au début et au mode
        cycle = db.query(Cycle).filter(
            func.strftime('%Y-%m-%d %H:%M:%S', Cycle.date_debut) == target_id_str,
            Cycle.type_cycle == mode
        ).first()
        
        if not cycle:
            return [f"Cycle introuvable : {target_id_str}"]

        debut_safe = cycle.date_debut.replace(tzinfo=None)
        fin_safe = (cycle.date_fin or datetime.now()).replace(tzinfo=None)

        # On récupère les commandes du mode en question dans cette tranche horaire
        all_commandes = db.query(Commande).filter(
            Commande.typeCommande == mode
        ).order_by(Commande.dateCommande.desc()).all()
        
        logs_events = []
        # On définit le petit suffixe si c'est personnalisé
        suffixe = " (Personnalisé)" if mode == "Personnalisé" else ""
        
        for c in all_commandes:
            if not c.dateCommande: continue
            c_date = c.dateCommande.replace(tzinfo=None)
            
            if debut_safe <= c_date <= fin_safe:
                nom_piece = "Inconnu"
                if c.boite:
                    nom_piece = c.boite.piece.nomPiece if c.boite.piece else (c.boite.code_barre or "Boîte")
                
                poste_nom = c.poste.nomStand if c.poste else "?"
                mag_nom = c.magasin.nomStand if c.magasin else "?"

                # On ajoute le suffixe à la fin de chaque message
                logs_events.append({
                    "time": c_date,
                    "msg": f"[{c_date.strftime('%H:%M:%S')}] Demande : {nom_piece} (par {poste_nom}){suffixe}"
                })

                if c.date_recuperation:
                    r_date = c.date_recuperation.replace(tzinfo=None)
                    logs_events.append({
                        "time": r_date,
                        "msg": f"[{r_date.strftime('%H:%M:%S')}] Retrait : {nom_piece} (au {mag_nom}){suffixe}"
                    })

                if c.date_livraison:
                    l_date = c.date_livraison.replace(tzinfo=None)
                    statut_label = "Annulé" if c.statutCommande == "Annulée" else "Livré"
                    lieu = f" (au {poste_nom})" if statut_label == "Livré" else ""
                    
                    logs_events.append({
                        "time": l_date,
                        "msg": f"[{l_date.strftime('%H:%M:%S')}] {statut_label} : {nom_piece}{lieu}{suffixe}"
                    })

        logs_events.sort(key=lambda x: x["time"], reverse=True)
        final_logs = [e["msg"] for e in logs_events]

        if not final_logs:
            final_logs.append(f"Aucune activité dans ce cycle {mode}.")

        return final_logs
    finally:
        db.close()

# ---------- CYCLES ----------
def get_commandes_cycle(debut_cycle: datetime, mode="Normal"):
    """
    Récupère les commandes terminées durant un cycle précis
    """
    db = SessionLocal()
    try:
        if debut_cycle.tzinfo is None:
            debut_cycle = debut_cycle.replace(tzinfo=timezone.utc)

        cycle = db.query(Cycle).filter(
            func.strftime('%Y-%m-%d %H:%M:%S', Cycle.date_debut) ==
            debut_cycle.strftime('%Y-%m-%d %H:%M:%S'),
            Cycle.type_cycle == mode # On sécurise la recherche du cycle par le mode
        ).first()
        
        if not cycle:
            return []

        fin_cycle = cycle.date_fin or datetime.now(timezone.utc)

        return db.query(Commande).filter(
            Commande.typeCommande == mode, # Filtre par mode
            Commande.statutCommande == "Commande finie",
            Commande.dateCommande >= cycle.date_debut,
            Commande.dateCommande <= fin_cycle
        ).order_by(Commande.dateCommande.asc()).all()
    finally:
        db.close()

def get_all_cycles(mode="Normal"):
    """Récupère tous les cycles filtrés par mode"""
    db = SessionLocal()
    try:
        # On filtre par type_cycle
        return db.query(Cycle).filter(Cycle.type_cycle == mode).order_by(Cycle.date_debut.desc()).all()
    finally:
        db.close()

def update_approvisionnement_boite(id_boite, nouveau_delai):
    """Met à jour le délai d'approvisionnement d'une boîte spécifique"""
    db = SessionLocal()
    try:
        boite = db.query(Boite).filter(Boite.idBoite == id_boite).first()
        if not boite:
            return False

        # Utilisation de la colonne 'approvisionnement' au lieu de 'temps_prep'
        boite.approvisionnement = nouveau_delai
        db.commit()
        return True
    except Exception as e:
        print(f"Erreur requete update_approvisionnement: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def get_approvisionnement_boite(id_boite):
    db = SessionLocal()
    try:
        result = db.query(Boite.approvisionnement).filter(Boite.idBoite == id_boite).first()
        if result is not None and len(result) > 0:
            return result[0]
        return None
    finally:
      db.close()
      
# ---------- Reset donnée ----------

def clear_production_data():
    """
    Vide les tables liées à la production, aux cycles et aux emplacements (cases)
    tout en conservant la configuration de base (Stands, Boites, Logins).
    """
    db = SessionLocal()
    try:
        db.query(Case).delete()
        db.query(Commande).delete()
        db.query(Cycle).delete()
        
        db.commit()
        return True
    except Exception as e:
        print(f"Erreur lors du vidage des tables : {e}")
        db.rollback()
        return False
    finally:
        db.close()

# ---------- DEPART PERSONNALISE ----------

def get_stocks_disponibles():
    db = SessionLocal()
    try:
        # On récupère toutes les boîtes avec leurs relations
        boites = db.query(Boite).all()
        
        resultat = []
        for b in boites:
            # Sécurité : nom par défaut si la pièce n'est pas liée
            nom = b.piece.nomPiece if b.piece else f"Boîte {b.code_barre}"
            
            resultat.append({
                "idBoite": int(b.idBoite), # Forcer l'entier
                "nom": nom,
                "code": b.code_barre,
                "idPosteAssigne": int(b.idPoste) if b.idPoste else None
            })
        return resultat
    finally:
        db.close()

def creer_commande_personnalisee(id_boite, id_poste, statut="A récupérer"):
    db = SessionLocal()
    try:
        # Utilisation de filter pour une recherche précise sur l'ID
        boite = db.query(Boite).filter(Boite.idBoite == id_boite).first()
        if not boite:
            return None
        
        nouvelle_commande = Commande(
            idBoite=boite.idBoite,
            idMagasin=boite.idMagasin,
            idPoste=id_poste,
            statutCommande=statut,
            typeCommande="Personnalisé"
        )
        db.add(nouvelle_commande)
        db.commit()
        db.refresh(nouvelle_commande)
        return nouvelle_commande
    finally:
        db.close()

def supprimer_commandes_personnalisees():
    db = SessionLocal()
    try:
        # On supprime uniquement les commandes marquées "Personnalisé"
        db.query(Commande).filter(Commande.typeCommande == "Personnalisé").delete()
        db.commit()
        return True
    except Exception as e:
        print(f"Erreur lors du vidage personnalisé: {e}")
        return False
    finally:
        db.close()