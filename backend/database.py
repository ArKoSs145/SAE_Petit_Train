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
class Boite(Base):
    __tablename__ = "boites"
    idBoite = Column(Integer, primary_key=True, index=True)
    code_barre = Column(String, index=True)
    nbBoite = Column(Integer)
    nomPiece = Column(String)
    description = Column(String)
    
    idMagasin = Column(Integer, ForeignKey("stands.idStand"), nullable=True)
    idPoste = Column(Integer, ForeignKey("stands.idStand"), nullable=True) 

    Cases = relationship("Case", back_populates="boite")
    magasin = relationship("Stand", foreign_keys=[idMagasin])
    poste = relationship("Stand", foreign_keys=[idPoste])
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

    # Liste des boîtes sans idPiece
    data_initiale = [
        {"idBoite": 6767, "nomPiece": "Pièce Test (Cahier)", "description": "Objet de test", "code_barre": "3601020016223"},
        {"idBoite": 1, "nomPiece": "Phare Bas de Gamme", "description": "", "code_barre": "TEST1"},
        {"idBoite": 2, "nomPiece": "Phare Moyenne Gamme", "description": "", "code_barre": "TEST2"},
        {"idBoite": 3, "nomPiece": "Phare Haut de Gamme", "description": "", "code_barre": "TEST3"},
        {"idBoite": 4, "nomPiece": "Vis Diametre 2", "description": "...", "code_barre": "TEST4"},
        {"idBoite": 5, "nomPiece": "Ecrou 6 pans", "description": "...", "code_barre": "TEST5"},
        {"idBoite": 6, "nomPiece": "Vis Diametre 4", "description": "...", "code_barre": "TEST6"},
        {"idBoite": 7, "nomPiece": "Rondelle", "description": "...", "code_barre": "TEST7"},
        {"idBoite": 8, "nomPiece": "Corps de phare", "description": "...", "code_barre": "TEST8"},
        {"idBoite": 9, "nomPiece": "Capot pour phare", "description": "...", "code_barre": "TEST9"},
        {"idBoite": 10, "nomPiece": "Notice", "description": "Notice papier", "code_barre": "TEST10"},
        {"idBoite": 11, "nomPiece": "Sachet", "description": "", "code_barre": "TEST11"},
        {"idBoite": 12, "nomPiece": "Fixation basse", "description": "", "code_barre": "TEST12"},
        {"idBoite": 13, "nomPiece": "Fixation phare", "description": "", "code_barre": "TEST13"},
        {"idBoite": 14, "nomPiece": "Pince cadre", "description": "", "code_barre": "TEST14"},
        {"idBoite": 15, "nomPiece": "Catadopte Non Empilable", "description": "", "code_barre": "TEST15"},
        {"idBoite": 16, "nomPiece": "Protection cadre", "description": "", "code_barre": "TEST16"},
        {"idBoite": 17, "nomPiece": "Ecrou carré", "description": "", "code_barre": "TEST17"},
        {"idBoite": 18, "nomPiece": "Support cadre", "description": "", "code_barre": "TEST18"},
        {"idBoite": 19, "nomPiece": "Support catadiope", "description": "", "code_barre": "TEST19"},
        {"idBoite": 20, "nomPiece": "Catadiope", "description": "", "code_barre": "TEST20"},
        {"idBoite": 21, "nomPiece": "Vis cadatiope", "description": "", "code_barre": "TEST21"},
        {"idBoite": 22, "nomPiece": "Ampoule", "description": "", "code_barre": "TEST22"},
        {"idBoite": 23, "nomPiece": "Lamelle masse", "description": "", "code_barre": "TEST23"},
        {"idBoite": 24, "nomPiece": "Ecrou dia 5", "description": "", "code_barre": "TEST24"},
        {"idBoite": 25, "nomPiece": "Vis carré dia 5", "description": "", "code_barre": "TEST25"},
        {"idBoite": 26, "nomPiece": "Rondelle frein", "description": "", "code_barre": "TEST26"},
        {"idBoite": 27, "nomPiece": "Catadiope phare MG", "description": "", "code_barre": "TEST27"},
        {"idBoite": 28, "nomPiece": "Socle", "description": "", "code_barre": "TEST28"},
        {"idBoite": 29, "nomPiece": "Fil et cosse", "description": "", "code_barre": "TEST29"},
        {"idBoite": 30, "nomPiece": "Vis pour cosse", "description": "", "code_barre": "TEST30"},
        {"idBoite": 31, "nomPiece": "Fil électrique", "description": "", "code_barre": "TEST31"},
        {"idBoite": 32, "nomPiece": "Cosse", "description": "", "code_barre": "TEST32"},
        {"idBoite": 33, "nomPiece": "Vis de fermeture", "description": "", "code_barre": "TEST33"},
        {"idBoite": 34, "nomPiece": "Vis fixation cosse", "description": "", "code_barre": "TEST34"},
        {"idBoite": 35, "nomPiece": "Sac à visserie", "description": "", "code_barre": "TEST35"},
        {"idBoite": 36, "nomPiece": "Catadioptre + circuit", "description": "", "code_barre": "TEST36"},
        {"idBoite": 37, "nomPiece": "Socle arrière", "description": "", "code_barre": "TEST37"},
        {"idBoite": 38, "nomPiece": "Kit fixation", "description": "", "code_barre": "TEST38"},
        {"idBoite": 39, "nomPiece": "Fil", "description": "", "code_barre": "TEST39"},
    ]

    for item in data_initiale:
        if not db.query(Boite).filter_by(idBoite=item["idBoite"]).first():
            db.add(Boite(**item, nbBoite=10, approvisionnement=120))

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
