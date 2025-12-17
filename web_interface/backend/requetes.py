from database import SessionLocal, Stand, Piece, Boite, Case, Commande, Login, Train, Cycle
from datetime import datetime, timezone
from sqlalchemy import func

# ---------- TRAIN ----------
def get_position_train():
    db = SessionLocal()
    try:
        train = db.query(Train).first()
        return train.position if train else None
    finally:
        db.close()

# ---------- STAND ----------
def create_stand(nom):
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
    db = SessionLocal()
    try:
        return db.query(Stand).all()
    finally:
        db.close()

def get_stand_by_id(id_stand):
    db = SessionLocal()
    try:
        return db.query(Stand).filter(Stand.idStand == id_stand).first()
    finally:
        db.close()

# ---------- PIECES ----------
def create_piece(nom, description=""):
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
    db = SessionLocal()
    try:
        return db.query(Piece).all()
    finally:
        db.close()

def get_piece_by_id(id_piece):
    db = SessionLocal()
    try:
        return db.query(Piece).filter(Piece.idPiece == id_piece).first()
    finally:
        db.close()

# ---------- BOITES ----------
def create_boite(id_piece, code_barre, nbBoite, idMagasin=None):
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
    db = SessionLocal()
    try:
        return db.query(Boite).filter(Boite.idBoite == id_boite).first()
    finally:
        db.close()

def get_all_boites():
    db = SessionLocal()
    try:
        return db.query(Boite).all()
    finally:
        db.close()

# ---------- CASES ----------
def assigner_case(id_boite, id_stand, ligne, colonne):
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
    db = SessionLocal()
    try:
        return db.query(Case).filter(Case.idStand == id_stand).all()
    finally:
        db.close()

def get_cases_dune_boite(id_boite):
    db = SessionLocal()
    try:
        return db.query(Case).filter(Case.idBoite == id_boite).all()
    finally:
        db.close()

def supprimer_case(id_case):
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
    db = SessionLocal()
    try:
        commande = db.query(Commande).filter(Commande.idCommande == id_commande).first()

        if not commande:
            return False  # Commande inexistante

        db.delete(commande)
        db.commit()
        return True
    finally:
        db.close()
        
def changer_statut_commande(id_commande):
    db = SessionLocal()
    try:
        commande = db.query(Commande).filter(Commande.idCommande == id_commande).first()
        if not commande:
            return {"status": "error", "message": "Commande introuvable"}

        if commande.statutCommande == "A récupérer":
            commande.statutCommande = "A déposer"
            commande.date_recuperation = datetime.now() 
            
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

def get_commandes_depuis_stand(id_prochain):
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
            commandes.extend(db.query(Commande).filter(Commande.idPoste == mid).order_by(Commande.idCommande.asc()).all())

        return commandes
    finally:
        db.close()

def get_commandes_stand(id_poste):
    db = SessionLocal()
    try:
        return db.query(Commande).filter(Commande.idPoste == id_poste).order_by(Commande.idCommande.asc()).all()
    finally:
        db.close()

# ---------- LOGIN ----------
def create_user(username, password, email):
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
    db = SessionLocal()
    try:
        return db.query(Login).filter(Login.username == username).first()
    finally:
        db.close()

def get_all_users():
    db = SessionLocal()
    try:
        return db.query(Login).all()
    finally:
        db.close()

# ---------- PIECES ARRIVÉES DANS LES POSTES (avec nom de pièce) ----------
def get_pieces_arrivees_postes(debut, fin):
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


# ---------- BOÎTES RÉCUPÉRÉES DANS LES MAGASINS (avec nom de pièce) ----------
def get_boites_recuperees_magasins(debut, fin):
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

## --- backend/requetes.py ---
def get_commandes_cycle_logs(debut_cycle: datetime):
    db = SessionLocal()
    try:
        # L'ID reçu est une date théorique (ex: 2023-10-27 10:00:00)
        target_id_str = debut_cycle.strftime('%Y-%m-%d %H:%M:%S')

        # 1. On récupère TOUS les cycles et on cherche le bon en Python
        # Cela évite les problèmes de format SQL vs Python
        cycles = db.query(Cycle).all()
        found_cycle = None
        
        for c in cycles:
            if c.date_debut:
                # On formate la date DB exactement comme l'ID cible
                c_str = c.date_debut.strftime('%Y-%m-%d %H:%M:%S')
                if c_str == target_id_str:
                    found_cycle = c
                    break
        
        if not found_cycle:
            return [f"Cycle introuvable : {target_id_str}"]

        # 2. Définition des bornes (Naïf pour comparaison sûre)
        debut_safe = found_cycle.date_debut.replace(tzinfo=None)
        
        if found_cycle.date_fin:
            fin_safe = found_cycle.date_fin.replace(tzinfo=None)
        else:
            fin_safe = datetime.now().replace(tzinfo=None)

        # 3. Récupération et filtrage manuel des commandes
        # On charge tout et on filtre en Python pour être certain du résultat
        all_commandes = db.query(Commande).order_by(Commande.dateCommande.desc()).all()
        
        logs_events = []
        
        for c in all_commandes:
            if not c.dateCommande: continue
            
            c_date = c.dateCommande.replace(tzinfo=None)
            
            # Vérification : est-ce dans le créneau ?
            if debut_safe <= c_date <= fin_safe:
                
                # --- Formatage du log ---
                nom_piece = "Inconnu"
                if c.boite:
                    if c.boite.piece: nom_piece = c.boite.piece.nomPiece
                    elif c.boite.code_barre: nom_piece = c.boite.code_barre
                
                poste_nom = c.poste.nomStand if c.poste else "?"
                mag_nom = c.magasin.nomStand if c.magasin else "?"

                # Event 1 : Demande
                logs_events.append({
                    "time": c_date,
                    "msg": f"[{c_date.strftime('%H:%M:%S')}] Demande : {nom_piece} (par {poste_nom})"
                })

                # Event 2 : Retrait
                if c.date_recuperation:
                    r_date = c.date_recuperation.replace(tzinfo=None)
                    logs_events.append({
                        "time": r_date,
                        "msg": f"[{r_date.strftime('%H:%M:%S')}] Retrait : {nom_piece} (au {mag_nom})"
                    })

                # Event 3 : Livraison
                if c.date_livraison:
                    l_date = c.date_livraison.replace(tzinfo=None)
                    logs_events.append({
                        "time": l_date,
                        "msg": f"[{l_date.strftime('%H:%M:%S')}] Livré   : {nom_piece} (au {poste_nom})"
                    })

        # Tri chronologique inverse
        logs_events.sort(key=lambda x: x["time"], reverse=True)
        
        final_logs = [e["msg"] for e in logs_events]

        if not final_logs:
            final_logs.append("Aucune activité dans ce cycle (dates vérifiées).")

        return final_logs

    finally:
        db.close()
        
# ---------- CYCLES ----------
def get_commandes_cycle(debut_cycle: datetime):
    db = SessionLocal()
    try:
        if debut_cycle.tzinfo is None:
            debut_cycle = debut_cycle.replace(tzinfo=timezone.utc)

        cycle = db.query(Cycle).filter(
            func.strftime('%Y-%m-%d %H:%M:%S', Cycle.date_debut) ==
            debut_cycle.strftime('%Y-%m-%d %H:%M:%S')
        ).first()
        if not cycle:
            return []

        fin_cycle = cycle.date_fin or datetime.now(timezone.utc)

        commandes = db.query(Commande).filter(
            Commande.statutCommande == "Commande finie",
            Commande.dateCommande >= cycle.date_debut,
            Commande.dateCommande <= fin_cycle
        ).order_by(Commande.dateCommande.asc()).all()

        return commandes
    finally:
        db.close()

# ---------- CYCLES ----------
def get_all_cycles():
    db = SessionLocal()
    try:
        cycles = (db.query(Cycle).order_by(Cycle.date_debut.desc()).all())
        return cycles
    finally:
        db.close()
