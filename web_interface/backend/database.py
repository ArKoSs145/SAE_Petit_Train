from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, PrimaryKeyConstraint, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime


DATABASE_URL = "sqlite:///./train.db"

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


# Table des boites
class Boite(Base):
    __tablename__ = "boites"
    idBoite = Column(Integer, primary_key=True, index=True)
    idPiece = Column(Integer, ForeignKey("pieces.idPiece"))
    code_barre = Column(String, index=True)
    nbBoite = Column(Integer)
    idMagasin = Column(Integer, ForeignKey("stands.idStand"))  # <-- magasin de stockage

    piece = relationship("Piece", back_populates="boite")
    Cases = relationship("Case", back_populates="boite")
    magasin = relationship("Stand")  # relation pour connaître où est stockée la boîte


# Table des stands / magasins
class Stand(Base):
    __tablename__ = "stands"
    idStand = Column(Integer, primary_key=True)
    nomStand = Column(String)

    Cases = relationship("Case", back_populates="Stand")
    commandes_poste = relationship("Commande", foreign_keys="Commande.idPoste")
    commandes_magasin = relationship("Commande", foreign_keys="Commande.idMagasin")


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
    
    # Stand qui scanne
    idPoste = Column(Integer, ForeignKey("stands.idStand"))
    
    # Stand où la boîte est stockée
    idMagasin = Column(Integer, ForeignKey("stands.idStand"))

    dateCommande = Column(DateTime, default=datetime.utcnow)
    statutCommande = Column(String, default="A récupérer")

    # relations
    boite = relationship("Boite")
    poste = relationship("Stand", foreign_keys=[idPoste])
    magasin = relationship("Stand", foreign_keys=[idMagasin])


# Table Login
class Login(Base):
    __tablename__ = "login"
    idLogin = Column(Integer, primary_key=True, index=True)
    username = Column(String)
    password = Column(String)  # hashé en sha256
    email = Column(String)


# Table Train
class Train(Base):
    __tablename__ = "train"
    idTrain = Column(Integer, primary_key=True)
    position = Column(Integer, ForeignKey("Stands.idStand"))
    
    def __init__(self, position):
        db = SessionLocal()
        try:
            Stands = db.query(Stand).order_by(Stand.idStand).all()
            self.postes = [m.idStand for m in Stands]
            if position in self.postes:
                self.index = self.postes.index(position)
            else:
                self.index = 0
            self.position = self.postes[self.index]
        finally:
            db.close()

    def get_position(self):
        """Retourne la position actuelle du train (idStand)."""
        return self.position
    
    def move_forward(self):
        """Déplace le train vers le Stand suivant."""
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

    # Piece du excel
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

    nouvelles = [
        Piece(**p) for p in pieces_a_creer
        if not db.query(Piece).filter_by(idPiece=p["idPiece"]).first()
    ]

    if nouvelles:
        db.bulk_save_objects(nouvelles)
        print(f"{len(nouvelles)} pièces ajoutées.")
    else:
        print("Toutes les pièces existent déjà.")

    boites_a_creer = [
        {"idBoite": 6767, "idPiece": 4141, "code_barre": "3601020016223", "nbBoite": 10},
        *[
            {"idBoite": i, "idPiece": i, "code_barre": f"TEST{i}", "nbBoite": 10}
            for i in range(1, 40)
        ]
    ]

    nouvelles = [
        Boite(**b) for b in boites_a_creer
        if not db.query(Boite).filter_by(idBoite=b["idBoite"]).first()
    ]

    if nouvelles:
        db.bulk_save_objects(nouvelles)
        print(f"{len(nouvelles)} boîtes ajoutées.")
    else:
        print("Toutes les boîtes existent déjà.")


    db.commit()

    Stand_a_creer = [
        {"idStand": 1, "nomStand": "Stand 1"},
        {"idStand": 2, "nomStand": "Stand 2"},
        {"idStand": 3, "nomStand": "Stand 3"},
        {"idStand": 4, "nomStand": "Stand 4"},
        {"idStand": 5, "nomStand": "Poste 1"},
        {"idStand": 6, "nomStand": "Poste 2"},
        {"idStand": 7, "nomStand": "Poste 3"},
    ]

    nouveaux = [
        Stand(**s) for s in Stand_a_creer
        if not db.query(Stand).filter_by(idStand=s["idStand"]).first()
    ]

    if nouveaux:
        db.bulk_save_objects(nouveaux)
        print(f"{len(nouveaux)} stands ajoutés.")
    else:
        print("Tous les stands existent déjà.")

    db.commit()
    
    # Création du train au Stand 1 s'il n'existe pas déja
    train_existant = db.query(Train).first()
    if not train_existant:
        train = Train(position=1)
        db.add(train)
        db.commit()
        db.refresh(train)
        print(f"Train créé au Stand {train.position}")
    else:
        print("Un train existe déjà dans la base de données.")

    db.commit()


    # Création des Cases dans chaque Stand
    Case_a_creer = [
        # -------- Stand 1 --------
        {"idCase": 1, "idStand": 1, "idBoite": 6767, "ligne": 1, "colonne": 1},
        {"idCase": 2, "idStand": 1, "idBoite": 2, "ligne": 1, "colonne": 2},
        {"idCase": 3, "idStand": 1, "idBoite": 3, "ligne": 2, "colonne": 1},
        {"idCase": 4, "idStand": 1, "idBoite": 4, "ligne": 2, "colonne": 2},
        {"idCase": 5, "idStand": 1, "idBoite": 5, "ligne": 3, "colonne": 1},
        {"idCase": 6, "idStand": 1, "idBoite": 6, "ligne": 3, "colonne": 2},
        {"idCase": 7, "idStand": 1, "idBoite": 7, "ligne": 4, "colonne": 1},
        {"idCase": 8, "idStand": 1, "idBoite": 8, "ligne": 4, "colonne": 2},
        {"idCase": 9, "idStand": 1, "idBoite": 9, "ligne": 5, "colonne": 1},
        {"idCase": 10, "idStand": 1, "idBoite": 10, "ligne": 5, "colonne": 2},
        {"idCase": 11, "idStand": 1, "idBoite": 11, "ligne": 6, "colonne": 1},
        {"idCase": 12, "idStand": 1, "idBoite": 12, "ligne": 6, "colonne": 2},
        {"idCase": 13, "idStand": 1, "idBoite": 13, "ligne": 7, "colonne": 1},
        {"idCase": 14, "idStand": 1, "idBoite": 14, "ligne": 7, "colonne": 2},
        {"idCase": 15, "idStand": 1, "idBoite": 15, "ligne": 8, "colonne": 1},
        {"idCase": 16, "idStand": 1, "idBoite": 16, "ligne": 8, "colonne": 2},
        {"idCase": 17, "idStand": 1, "idBoite": 17, "ligne": 9, "colonne": 1},
        {"idCase": 18, "idStand": 1, "idBoite": 18, "ligne": 9, "colonne": 2},

        # -------- Stand 2 --------
        {"idCase": 19, "idStand": 2, "idBoite": 19, "ligne": 1, "colonne": 1},
        {"idCase": 20, "idStand": 2, "idBoite": 20, "ligne": 1, "colonne": 2},
        {"idCase": 21, "idStand": 2, "idBoite": 21, "ligne": 2, "colonne": 1},
        {"idCase": 22, "idStand": 2, "idBoite": 22, "ligne": 2, "colonne": 2},
        {"idCase": 23, "idStand": 2, "idBoite": 23, "ligne": 3, "colonne": 1},
        {"idCase": 24, "idStand": 2, "idBoite": 24, "ligne": 3, "colonne": 2},
        {"idCase": 25, "idStand": 2, "idBoite": 25, "ligne": 4, "colonne": 1},
        {"idCase": 26, "idStand": 2, "idBoite": 26, "ligne": 4, "colonne": 2},
        {"idCase": 27, "idStand": 2, "idBoite": 27, "ligne": 5, "colonne": 1},
        {"idCase": 28, "idStand": 2, "idBoite": 28, "ligne": 5, "colonne": 2},
        {"idCase": 29, "idStand": 2, "idBoite": 29, "ligne": 6, "colonne": 1},
        {"idCase": 30, "idStand": 2, "idBoite": 30, "ligne": 6, "colonne": 2},
        {"idCase": 31, "idStand": 2, "idBoite": 31, "ligne": 7, "colonne": 1},
        {"idCase": 32, "idStand": 2, "idBoite": 32, "ligne": 7, "colonne": 2},
        {"idCase": 33, "idStand": 2, "idBoite": 33, "ligne": 8, "colonne": 1},
        {"idCase": 34, "idStand": 2, "idBoite": 34, "ligne": 8, "colonne": 2},
        {"idCase": 35, "idStand": 2, "idBoite": 35, "ligne": 9, "colonne": 1},
        {"idCase": 36, "idStand": 2, "idBoite": 36, "ligne": 9, "colonne": 2},

        # -------- Stand 3 --------
        {"idCase": 37, "idStand": 3, "idBoite": 37, "ligne": 1, "colonne": 1},
        {"idCase": 38, "idStand": 3, "idBoite": 38, "ligne": 1, "colonne": 2},
        {"idCase": 39, "idStand": 3, "idBoite": 39, "ligne": 2, "colonne": 1},
        
        # -------- Poste 1 --------
        {"idCase": 40, "idStand": 5, "idBoite": 6767, "ligne": 1, "colonne": 1},
         
    ]

    # Création des Cases
    nouveaux_Cases = []
    for e in Case_a_creer:
        if not db.query(Case).filter_by(idCase=e["idCase"]).first():
            nouveaux_Cases.append(Case(
                idCase=e["idCase"],
                idStand=e["idStand"],
                idBoite=e["idBoite"],
                ligne=e["ligne"],
                colonne=e["colonne"]
            ))

    if nouveaux_Cases:
        db.bulk_save_objects(nouveaux_Cases)
        print(f"{len(nouveaux_Cases)} Cases créés.")
    else:
        print("Toutes les Cases existent déjà.")

    db.commit()

    # Création d'un utilisateur de test
    existing_user = db.query(Login).filter_by(username="test_user").first()
    if not existing_user:
        new_user = Login(
            username="test",
            password="password123",
            email="test@example.com"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print(f"Utilisateur créé avec id : {new_user.idLogin}")
    else:
        print("L'utilisateur existe déjà.")

    db.close()

    # # Création de commandes exemples
    # commandes_a_creer = [
    #     {"idCommande": 1, "idBoite": 1, "idStand": 1},
    #     {"idCommande": 2, "idBoite": 2, "idStand": 1},
    #     {"idCommande": 3, "idBoite": 3, "idStand": 2},
    #     {"idCommande": 4, "idBoite": 4, "idStand": 3},
    #     {"idCommande": 5, "idBoite": 5, "idStand": 3},
    # ]

    # nouvelle_commandes = []

    # for c in commandes_a_creer:
    #     exist = db.query(Commande).filter_by(idCommande=c["idCommande"]).first()
    #     if not exist:
    #         nouvelle_commandes.append(Commande(
    #             idCommande=c["idCommande"],
    #             idBoite=c["idBoite"],
    #             idStand=c["idStand"]

    #         ))

    # if nouvelle_commandes:
    #     db.bulk_save_objects(nouvelle_commandes)
    #     print(f"{len(nouvelle_commandes)} commandes créées.")
    # else:
    #     print("Toutes les commandes existent déjà.")

    # db.commit()
    # db.close()