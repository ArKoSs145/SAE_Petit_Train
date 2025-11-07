from database import SessionLocal, Magasin, Piece, Boite, Emplacement, Commande, Login, Train
from sqlalchemy.orm import Session

def get_db():
    """
    Génère une session de base de données utilisable dans les dépendances FastAPI.
    Ferme automatiquement la session après utilisation.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_position_train():
    """
    Récupère la position actuelle du train.

    Returns:
        int | None: Identifiant du magasin où se trouve le train, ou None si non défini.
    """
    db = SessionLocal()
    try:
        train = db.query(Train).first()
        return train.position if train else None
    finally:
        db.close()

def create_magasin(nom: str):
    """
    Crée un nouveau magasin dans la base de données.

    Args:
        nom (str): Nom du magasin à ajouter.

    Returns:
        Magasin: L'objet Magasin créé.
    """
    db = SessionLocal()
    magasin = Magasin(nomMagasin=nom)
    db.add(magasin)
    db.commit()
    db.refresh(magasin)
    db.close()
    return magasin


def get_all_magasins():
    """
    Récupère la liste complète des magasins dans la base de données.

    Returns:
        list[Magasin]: Liste des magasins existants.
    """
    db = SessionLocal()
    data = db.query(Magasin).all()
    db.close()
    return data


def get_magasin_by_id(id_magasin: int):
    """
    Récupère un magasin spécifique à partir de son identifiant.

    Args:
        id_magasin (int): Identifiant du magasin.

    Returns:
        Magasin | None: L'objet Magasin trouvé ou None s'il n'existe pas.
    """
    db = SessionLocal()
    magasin = db.query(Magasin).filter(Magasin.idMagasin == id_magasin).first()
    db.close()
    return magasin


def create_piece(code_barre: str, nom: str, description: str = ""):
    """
    Crée une nouvelle pièce dans la base de données.

    Args:
        code_barre (str): Code-barres unique de la pièce.
        nom (str): Nom de la pièce.
        description (str, optional): Description optionnelle de la pièce.

    Returns:
        Piece: L'objet Piece créé.
    """
    db = SessionLocal()
    piece = Piece(code_barre=code_barre, nomPiece=nom, description=description)
    db.add(piece)
    db.commit()
    db.refresh(piece)
    db.close()
    return piece


def get_all_pieces():
    """
    Récupère toutes les pièces enregistrées dans la base de données.

    Returns:
        list[Piece]: Liste des pièces existantes.
    """
    db = SessionLocal()
    data = db.query(Piece).all()
    db.close()
    return data


def get_piece_by_code(code: str):
    """
    Recherche une pièce à partir de son code-barres.

    Args:
        code (str): Code-barres de la pièce.

    Returns:
        Piece | None: L'objet Piece trouvé ou None si non existant.
    """
    db = SessionLocal()
    piece = db.query(Piece).filter(Piece.code_barre == code).first()
    db.close()
    return piece


def create_boite(code_barre: str, id_piece: int, qte: int):
    """
    Crée une nouvelle boîte associée à une pièce existante.

    Args:
        code_barre (str): Code-barres unique de la boîte.
        id_piece (int): Identifiant de la pièce liée.
        qte (int): Quantité de boîtes.

    Returns:
        Boite: L'objet Boite créé.
    """
    db = SessionLocal()
    boite = Boite(code_barre=code_barre, idPiece=id_piece, qteBoite=qte)
    db.add(boite)
    db.commit()
    db.refresh(boite)
    db.close()
    return boite


def get_boite_by_code(code: str):
    """
    Recherche une boîte dans la base via son code-barres.

    Args:
        code (str): Code-barres de la boîte.

    Returns:
        Boite | None: L'objet Boite trouvé ou None si non existant.
    """
    db = SessionLocal()
    boite = db.query(Boite).filter(Boite.code_barre == code).first()
    db.close()
    return boite


def get_all_boites():
    """
    Récupère la liste de toutes les boîtes dans la base de données.

    Returns:
        list[Boite]: Liste des boîtes existantes.
    """
    db = SessionLocal()
    data = db.query(Boite).all()
    db.close()
    return data


def assigner_emplacement(id_boite: int, id_magasin: int, ligne: int, colonne: int):
    """
    Associe une boîte à un emplacement spécifique dans un magasin.

    Args:
        id_boite (int): Identifiant de la boîte.
        id_magasin (int): Identifiant du magasin.
        ligne (int): Ligne de l’emplacement.
        colonne (int): Colonne de l’emplacement.

    Returns:
        Emplacement: L'objet Emplacement créé.
    """
    db = SessionLocal()
    emplacement = Emplacement(idBoite=id_boite, idMagasin=id_magasin, ligne=ligne, colonne=colonne)
    db.add(emplacement)
    db.commit()
    db.refresh(emplacement)
    db.close()
    return emplacement


def get_emplacements_dun_magasin(id_magasin: int):
    """
    Récupère tous les emplacements associés à un magasin donné.

    Args:
        id_magasin (int): Identifiant du magasin.

    Returns:
        list[Emplacement]: Liste des emplacements du magasin.
    """
    db = SessionLocal()
    emplacements = db.query(Emplacement).filter(Emplacement.idMagasin == id_magasin).all()
    db.close()
    return emplacements


def get_emplacements_dune_boite(id_boite: int):
    """
    Récupère tous les emplacements où se trouve une boîte spécifique.

    Args:
        id_boite (int): Identifiant de la boîte.

    Returns:
        list[Emplacement]: Liste des emplacements liés à cette boîte.
    """
    db = SessionLocal()
    emplacements = db.query(Emplacement).filter(Emplacement.idBoite == id_boite).all()
    db.close()
    return emplacements


def supprimer_emplacement(id_emplacement: int):
    """
    Supprime un emplacement existant à partir de son identifiant.

    Args:
        id_emplacement (int): Identifiant de l’emplacement à supprimer.
    """
    db = SessionLocal()
    emp = db.query(Emplacement).filter(Emplacement.idEmplacement == id_emplacement).first()
    if emp:
        db.delete(emp)
        db.commit()
    db.close()


def changer_statut_commande(id_commande: int):
    """
    Change le statut d'une commande selon sa progression :
    - Si 'A récupérer' → devient 'A déposer'
    - Si 'A déposer' → devient 'Commande finie'
    - Sinon → statut inchangé

    Args:
        id_commande (int): Identifiant de la commande à modifier.

    Returns:
        dict: Résultat contenant le statut de l’opération et le nouveau statut.
    """
    db = SessionLocal()
    try:
        commande = db.query(Commande).filter(Commande.idCommande == id_commande).first()

        if not commande:
            return {"status": "error", "message": "Commande introuvable"}

        if commande.statutCommande == "A récupérer":
            commande.statutCommande = "A déposer"
            db.commit()
            db.refresh(commande)
            return {
                "status": "ok",
                "message": f"Commande {id_commande} mise à jour : A déposer",
                "commande": {
                    "idCommande": commande.idCommande,
                    "nouveau_statut": commande.statutCommande
                }
            }

        elif commande.statutCommande == "A déposer":
            commande.statutCommande = "Commande finie"
            db.commit()
            db.refresh(commande)
            return {
                "status": "ok",
                "message": f"Commande {id_commande} mise à jour : Commande finie",
                "commande": {
                    "idCommande": commande.idCommande,
                    "nouveau_statut": commande.statutCommande
                }
            }

        else:
            return {
                "status": "no_change",
                "message": f"Commande {id_commande} non modifiée (statut actuel : {commande.statutCommande})"
            }

    finally:
        db.close()
