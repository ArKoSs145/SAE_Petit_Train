import os
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, PrimaryKeyConstraint, UniqueConstraint
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'train.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

# Table des pièces
class Piece(Base):
    __tablename__ = "pieces"
    idPiece = Column(Integer, primary_key=True, index=True)
    nomPiece = Column(String)
    description = Column(String)
    boite = relationship("Boite", back_populates="piece", uselist=False)

class Boite(Base):
    __tablename__ = "boites"
    idBoite = Column(Integer, primary_key=True, index=True)
    idPiece = Column(Integer, ForeignKey("pieces.idPiece"))
    code_barre = Column(String, index=True)
    nbBoite = Column(Integer)
    
    
    # On autorise explicitement le NULL (None en Python) par défaut
    idMagasin = Column(Integer, ForeignKey("stands.idStand"), nullable=True)
    idPoste = Column(Integer, ForeignKey("stands.idStand"), nullable=True) 

    piece = relationship("Piece", back_populates="boite")
    Cases = relationship("Case", back_populates="boite")
    magasin = relationship("Stand", foreign_keys=[idMagasin])
    poste = relationship("Stand", foreign_keys=[idPoste])
    # Temps de préparation de la boîte en secondes
    approvisionnement = Column(Integer, default=0, nullable=False)

# Table des stands / magasins
class Stand(Base):
    __tablename__ = "stands"
    idStand = Column(Integer, primary_key=True)
    nomStand = Column(String)
    categorie = Column(Integer, default=0) # 0 = Poste, 1 = Magasin

    Cases = relationship("Case", back_populates="Stand")

    commandes_poste = relationship(
        "Commande",
        back_populates="poste",
        foreign_keys="Commande.idPoste"
    )
    commandes_magasin = relationship(
        "Commande",
        back_populates="magasin",
        foreign_keys="Commande.idMagasin"
    )

# Table des cases
class Case(Base):
    __tablename__ = "cases"
    idCase = Column(Integer, primary_key=True)
    idStand = Column(Integer, ForeignKey("stands.idStand"))
    idBoite = Column(Integer, ForeignKey("boites.idBoite"))
    ligne = Column(Integer)
    colonne = Column(Integer)

    __table_args__ = (
        UniqueConstraint('idStand', 'ligne', 'colonne', name="uq_case_par_stand"),
    )

    boite = relationship("Boite", back_populates="Cases")
    Stand = relationship("Stand", back_populates="Cases")

# Table des commandes
class Commande(Base):
    __tablename__ = "commandes"
    idCommande = Column(Integer, primary_key=True, index=True)
    idBoite = Column(Integer, ForeignKey("boites.idBoite"))
    idPoste = Column(Integer, ForeignKey("stands.idStand"))
    idMagasin = Column(Integer, ForeignKey("stands.idStand"))
    dateCommande = Column(DateTime, default=datetime.now)
    date_recuperation = Column(DateTime, nullable=True)
    date_livraison = Column(DateTime, nullable=True)
    statutCommande = Column(String, default="A récupérer")
    typeCommande = Column(String, default="Normal")  # "Normal" ou "Personnalisé"

    boite = relationship("Boite")
    poste = relationship("Stand", back_populates="commandes_poste", foreign_keys=[idPoste])
    magasin = relationship("Stand", back_populates="commandes_magasin", foreign_keys=[idMagasin])

# Table Cycle
class Cycle(Base):
    __tablename__ = "cycles"
    idCycle = Column(Integer, primary_key=True, autoincrement=True)
    date_debut = Column(DateTime, default=datetime.now)
    date_fin = Column(DateTime, nullable=True)
    type_cycle = Column(String, default="Normal")  # "Normal" ou "Personnalisé"
    
# Table Login
class Login(Base):
    __tablename__ = "login"
    idLogin = Column(Integer, primary_key=True, index=True)
    username = Column(String)
    password = Column(String)
    email = Column(String)

# Table Train
class Train(Base):
    __tablename__ = "train"
    idTrain = Column(Integer, primary_key=True)
    position = Column(Integer, ForeignKey("stands.idStand"))
    statut_train = Column(String) # "Normal" (pour l'application de base) ou "Personnalisé" (pour un départ personnalisé)
    
    def __init__(self, position, statut_train="Normal"):
            db = SessionLocal()
            try:
                Stands = db.query(Stand).order_by(Stand.idStand).all()
                self.postes = [m.idStand for m in Stands]
                if position in self.postes:
                    self.index = self.postes.index(position)
                else:
                    self.index = 0
                self.position = self.postes[self.index]
                self.statut_train = statut_train 
            finally:
                db.close()

    def get_position(self):
        return self.position
    
    def move_forward(self):
        self.index = (self.index + 1) % len(self.postes)
        self.position = self.postes[self.index]
        return self.position

def init_db():
    Base.metadata.create_all(bind=engine)

def drop_db():
    Base.metadata.drop_all(bind=engine)

def reset_db():
    drop_db()
    init_db()

def data_db():
    db = SessionLocal()

    # Initialisation des Pièces
    pieces_a_creer = [
        {"idPiece": 4141, "nomPiece": "Pièce Test (Cahier)", "description": "Objet de test"},
        {"idPiece": 1, "nomPiece": "Phare Bas de Gamme", "description": ""},
        {"idPiece": 2, "nomPiece": "Phare Moyenne Gamme", "description": ""},
        {"idPiece": 3, "nomPiece": "Phare Haut de Gamme", "description": ""},
        {"idPiece": 4, "nomPiece": "Vis Diametre 2", "description": "..."},
        {"idPiece": 5, "nomPiece": "Ecrou 6 pans", "description": "..."},
        {"idPiece": 6, "nomPiece": "Vis Diametre 4", "description": "..."},
        {"idPiece": 7, "nomPiece": "Rondelle", "description": "..."},
        {"idPiece": 8, "nomPiece": "Corps de phare", "description": "..."},
        {"idPiece": 9, "nomPiece": "Capot pour phare", "description": "..."},
        {"idPiece": 10, "nomPiece": "Notice", "description": "Notice papier"},
        {"idPiece": 11, "nomPiece": "Sachet", "description": ""},
        {"idPiece": 12, "nomPiece": "Fixation basse", "description": ""},
        {"idPiece": 13, "nomPiece": "Fixation phare", "description": ""},
        {"idPiece": 14, "nomPiece": "Pince cadre", "description": ""},
        {"idPiece": 15, "nomPiece": "Catadopte Non Empilable", "description": ""},
        {"idPiece": 16, "nomPiece": "Protection cadre", "description": ""},
        {"idPiece": 17, "nomPiece": "Ecrou carré", "description": ""},
        {"idPiece": 18, "nomPiece": "Support cadre", "description": ""},
        {"idPiece": 19, "nomPiece": "Support catadiope", "description": ""},
        {"idPiece": 20, "nomPiece": "Catadiope", "description": ""},
        {"idPiece": 21, "nomPiece": "Vis cadatiope", "description": ""},
        {"idPiece": 22, "nomPiece": "Ampoule", "description": ""},
        {"idPiece": 23, "nomPiece": "Lamelle masse", "description": ""},
        {"idPiece": 24, "nomPiece": "Ecrou dia 5", "description": ""},
        {"idPiece": 25, "nomPiece": "Vis carré dia 5", "description": ""},
        {"idPiece": 26, "nomPiece": "Rondelle frein", "description": ""},
        {"idPiece": 27, "nomPiece": "Catadiope phare MG", "description": ""},
        {"idPiece": 28, "nomPiece": "Socle", "description": ""},
        {"idPiece": 29, "nomPiece": "Fil et cosse", "description": ""},
        {"idPiece": 30, "nomPiece": "Vis pour cosse", "description": ""},
        {"idPiece": 31, "nomPiece": "Fil électrique", "description": ""},
        {"idPiece": 32, "nomPiece": "Cosse", "description": ""},
        {"idPiece": 33, "nomPiece": "Vis de fermeture", "description": ""},
        {"idPiece": 34, "nomPiece": "Vis fixation cosse", "description": ""},
        {"idPiece": 35, "nomPiece": "Sac à visserie", "description": ""},
        {"idPiece": 36, "nomPiece": "Catadioptre + circuit", "description": ""},
        {"idPiece": 37, "nomPiece": "Socle arrière", "description": ""},
        {"idPiece": 38, "nomPiece": "Kit fixation", "description": ""},
        {"idPiece": 39, "nomPiece": "Fil", "description": ""},
    ]

    for p in pieces_a_creer:
        if not db.query(Piece).filter_by(idPiece=p["idPiece"]).first():
            db.add(Piece(**p))

    # Initialisation des Boîtes avec approvisionnement à 120
    boites_a_creer = [
        {"idBoite": 6767, "idPiece": 4141, "code_barre": "3601020016223", "nbBoite": 10, "approvisionnement": 120},
        *[
            {"idBoite": i, "idPiece": i, "code_barre": f"TEST{i}", "nbBoite": 10, "approvisionnement": 120}
            for i in range(1, 40)
        ]
    ]

    for b in boites_a_creer:
        if not db.query(Boite).filter_by(idBoite=b["idBoite"]).first():
            db.add(Boite(**b))

    db.commit()

    # Initialisation des Stands avec catégories
    Stand_a_creer = [
        {"idStand": 1, "nomStand": "Poste 1", "categorie": 0},
        {"idStand": 2, "nomStand": "Poste 2", "categorie": 0},
        {"idStand": 3, "nomStand": "Poste 3", "categorie": 0},
        {"idStand": 4, "nomStand": "Presse à injecter", "categorie": 1},
        {"idStand": 7, "nomStand": "Presse à emboutir", "categorie": 1},
        {"idStand": 6, "nomStand": "Tour CN", "categorie": 1},
        {"idStand": 5, "nomStand": "Magasin externe", "categorie": 1},
    ]

    for s in Stand_a_creer:
        if not db.query(Stand).filter_by(idStand=s["idStand"]).first():
            db.add(Stand(**s))

    db.commit()
    

    # Création des deux trains avec des IDs fixes
    if not db.query(Train).filter_by(idTrain=1).first():
        db.add(Train(position=4, statut_train="Normal"))
    if not db.query(Train).filter_by(idTrain=2).first():
        db.add(Train(position=1, statut_train="Personnalisé"))

    # Création de l'utilisateur
    if not db.query(Login).filter_by(username="test").first():
        db.add(Login(username="test", password="password123", email="test@example.com"))

    
    db.commit()
    db.close()
