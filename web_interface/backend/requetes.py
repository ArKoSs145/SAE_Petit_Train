from database import SessionLocal, Stand, Piece, Boite, Case, Commande, Login, Train
from datetime import datetime

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
def changer_statut_commande(id_commande):
    db = SessionLocal()
    try:
        commande = db.query(Commande).filter(Commande.idCommande == id_commande).first()
        if not commande:
            return {"status": "error", "message": "Commande introuvable"}

        if commande.statutCommande == "A récupérer":
            commande.statutCommande = "A déposer"
        elif commande.statutCommande == "A déposer":
            commande.statutCommande = "Commande finie"
        else:
            return {"status": "no_change", "message": f"Commande {id_commande} non modifiée (statut actuel : {commande.statutCommande})"}

        db.commit()
        db.refresh(commande)
        return {"status": "ok", "message": f"Commande {id_commande} mise à jour : {commande.statutCommande}", "commande": {"idCommande": commande.idCommande, "nouveau_statut": commande.statutCommande}}
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
