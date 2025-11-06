from database import SessionLocal, Magasin, Piece, Boite, Emplacement
from sqlalchemy.orm import Session


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_magasin(nom: str):
    db = SessionLocal()
    magasin = Magasin(nomMagasin=nom)
    db.add(magasin)
    db.commit()
    db.refresh(magasin)
    db.close()
    return magasin

def get_all_magasins():
    db = SessionLocal()
    data = db.query(Magasin).all()
    db.close()
    return data

def get_magasin_by_id(id_magasin: int):
    db = SessionLocal()
    magasin = db.query(Magasin).filter(Magasin.idMagasin == id_magasin).first()
    db.close()
    return magasin

def create_piece(code_barre: str, nom: str, description: str = ""):
    db = SessionLocal()
    piece = Piece(code_barre=code_barre, nomPiece=nom, description=description)
    db.add(piece)
    db.commit()
    db.refresh(piece)
    db.close()
    return piece

def get_all_pieces():
    db = SessionLocal()
    data = db.query(Piece).all()
    db.close()
    return data

def get_piece_by_code(code: str):
    db = SessionLocal()
    piece = db.query(Piece).filter(Piece.code_barre == code).first()
    db.close()
    return piece

def create_boite(code_barre: str, id_piece: int, qte: int):
    db = SessionLocal()
    boite = Boite(code_barre=code_barre, idPiece=id_piece, qteBoite=qte)
    db.add(boite)
    db.commit()
    db.refresh(boite)
    db.close()
    return boite

def get_boite_by_code(code: str):
    db = SessionLocal()
    boite = db.query(Boite).filter(Boite.code_barre == code).first()
    db.close()
    return boite

def get_all_boites():
    db = SessionLocal()
    data = db.query(Boite).all()
    db.close()
    return data

def assigner_emplacement(id_boite: int, id_magasin: int, ligne: int, colonne: int):
    db = SessionLocal()
    emplacement = Emplacement(idBoite=id_boite, idMagasin=id_magasin, ligne=ligne, colonne=colonne)
    db.add(emplacement)
    db.commit()
    db.refresh(emplacement)
    db.close()
    return emplacement

def get_emplacements_dun_magasin(id_magasin: int):
    db = SessionLocal()
    emplacements = db.query(Emplacement).filter(Emplacement.idMagasin == id_magasin).all()
    db.close()
    return emplacements

def get_emplacements_dune_boite(id_boite: int):
    db = SessionLocal()
    emplacements = db.query(Emplacement).filter(Emplacement.idBoite == id_boite).all()
    db.close()
    return emplacements

def supprimer_emplacement(id_emplacement: int):
    db = SessionLocal()
    emp = db.query(Emplacement).filter(Emplacement.idEmplacement == id_emplacement).first()
    if emp:
        db.delete(emp)
        db.commit()
    db.close()
