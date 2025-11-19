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

    piece = relationship("Piece", back_populates="boite")
    Cases = relationship("Case", back_populates="boite")


# Table des Stand (Stands/Postes)
class Stand(Base):
    __tablename__ = "Stand"
    idStand = Column(Integer, primary_key=True)
    nomStand = Column(String)

    Cases = relationship("Case", back_populates="Stand")


# Table des cases
class Case(Base):
    __tablename__ = "case"
    idCase = Column(Integer, primary_key=True)
    idStand = Column(Integer, ForeignKey("Stands.idStand"))
    idBoite = Column(Integer, ForeignKey("boites.idBoite"))
    ligne = Column(Integer)
    colonne = Column(Integer)

    __table_args__ = (
        UniqueConstraint('idStand', 'ligne', 'colonne', name="uq_case_par_Stand"),
    )

    boite = relationship("Boite", back_populates="Cases")
    Stand = relationship("Stand", back_populates="Cases")

# Table des commandes
class Commande(Base):
    __tablename__ = "commandes"
    idCommande = Column(Integer, primary_key=True, index=True)
    idBoite = Column(Integer, ForeignKey("boites.idBoite"))
    idPoste = Column(Integer, ForeignKey("Stands.idStand"))
    dateCommande = Column(DateTime, default=datetime.utcnow)
    statutCommande = Column(String, default="A récupérer")

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

    # Liste des pièces du excel
    pieces_a_creer = [
        {"idPiece": 4141, "nomPiece": "Pièce Test (Cahier)", "description": "Objet de test"},
        {"idPiece": 1, "nomPiece": "Phare Bas de Gamme", "description": ""},
        {"idPiece": 2, "nomPiece": "Phare Moyenne Gamme", "description": ""},
        {"idPiece": 3, "nomPiece": "Phare Haut de Gamme", "description": ""},
        {"idPiece": 4, "nomPiece": "Vis Diametre 2", "description": "Vis pour fixer le capot du phare PBET3 sur le corps PBET2 de phare BG et Vis de diamètre 2"},
        {"idPiece": 5, "nomPiece": "Ecrou 6 pans", "description": "Ecrou à associer avec la vis PBEB5 pour l'assemblage de l'articulation du phare BG et écrou de diamètre 4"},
        {"idPiece": 6, "nomPiece": "Vis Diametre 4", "description": "Vis à associer à une rondelle PBEB6 et à l'écrou PBEB3 pour l'assemblage de l'articulation réglage du BG et vis à associer à une rondelle PBEB6 pour l'assemblage de PBIQ3 et PBII2 et vis de diamtére 4"},
        {"idPiece": 7, "nomPiece": "Rondelle", "description": "Rondelle à associer à aux vis PBEB5 et à l'écrou PBEB3 pour l'assemblage de l'articulation réglage du BG et rondelle de diamètre 4"},
        {"idPiece": 8, "nomPiece": "Corps de phare", "description": "Coprs de phare BG à tester à 100% par les testeurs à pile au poste 1"},
        {"idPiece": 9, "nomPiece": "Capot pour phare", "description": "Capot à assembler avec la vis PBEB2 et le corps de phare BG"},
        {"idPiece": 10, "nomPiece": "Notice", "description": "Notice papier unique pour les 3 références et papier imprimée en extérieur"},
        {"idPiece": 11, "nomPiece": "Sachet ", "description": "Sachet unique pour les 3 références"},
        {"idPiece": 12, "nomPiece": "Fixation basse ", "description": ""},
        {"idPiece": 13, "nomPiece": "Fixation phare", "description": "A fixer sur le corps de phare PBET2"},
        {"idPiece": 14, "nomPiece": "Pince cadre", "description": "Sous ensemble Pince permettant de fixer lephare BG au vélo"},
        {"idPiece": 15, "nomPiece": "Catadiope Non Empilable", "description": "Sous ensemble catadiope à assembler avec les ensembles de l'articulation et non empilable"},
        {"idPiece": 16, "nomPiece": "Protection cadre", "description": "Piéce caoutchouc en contact avec le cadre du vélo et en caoutchouc"},
        {"idPiece": 17, "nomPiece": "Ecrou carré", "description": "Ecrou à insére dans la protection cadre en caoutchouc pour l'assemblage avec le support de cadre"},
        {"idPiece": 18, "nomPiece": "Support cadre", "description": "Pince plastique dans laquelle sera glissé la pièce caoutchouc PEBT4 et l'écrou PBEB4"},
        {"idPiece": 19, "nomPiece": "Support catadiope", "description": "Patte en tole afin de fixer le catadiope du BG"},
        {"idPiece": 20, "nomPiece": "Catadiope", "description": "Catadiope à assembler avec la patte PBIT1 et la vis PBEB1"},
        {"idPiece": 21, "nomPiece": "Vis cadatiope", "description": "Vis spéciale afin de fixer le cadatiope à son support"},
        {"idPiece": 22, "nomPiece": "Ampoule", "description": "Ampoule pour le MG et fragiome"},
        {"idPiece": 23, "nomPiece": "Lamelle masse", "description": "Lamelle en tole afin de relier l'ampoule et dévidoire "},
        {"idPiece": 24, "nomPiece": "Ecrou dia 5", "description": "Écrou utilisé dans les références de phares MG et HG et ecrou diamétre 5 Acier zingué"},
        {"idPiece": 25, "nomPiece": "Vis carré dia 5", "description": "Vis utilisée dans les références de phare MG et HG et vis fabriquée en interne diamétre 5 Acier zingué"},
        {"idPiece": 26, "nomPiece": "Rondelle frein", "description": "Rondelle utilisée dans les références de phare MG et HG et rondelle éventail diamétre 5 Acier zingué"},
        {"idPiece": 27, "nomPiece": "Catadiope phare MG", "description": "Catadiope pour phare MG et fragile"},
        {"idPiece": 28, "nomPiece": "Socle", "description": "Corps pour phare MG et en plastique fini"},
        {"idPiece": 29, "nomPiece": "Fil et cosse", "description": "Sous ensemble fil plus cosse pour alimentation de l'ampoule"},
        {"idPiece": 30, "nomPiece": "Vis pour cosse", "description": "Vis afin de fixer le fil dénudé avec la cosse sur le corps de phare MG et en acier zingué"},
        {"idPiece": 31, "nomPiece": "Fil électrique", "description": "Bobine de fil et dévidoir "},
        {"idPiece": 32, "nomPiece": "Cosse", "description": "Cosse et en acier cuivré"},
        {"idPiece": 33, "nomPiece": "Vis de fermeture", "description": "Vis pour assembler le corps de phare HG avec son socle et en acier oxytop"},
        {"idPiece": 34, "nomPiece": "Vis fixation cosse", "description": "Vis pour fixer les pattes de connexion"},
        {"idPiece": 35, "nomPiece": "Sac à visserie", "description": "Sachet pour assembler 2 vis carrée diamétre 5 avec 2 rondelles éventail et 2 écrou 6 pans afinde créer le sous ensemble PHIQ1"},
        {"idPiece": 36, "nomPiece": "Catadioptre + circuit", "description": "Catadiope pour le phare HG"},
        {"idPiece": 37, "nomPiece": "Socle arrière", "description": "Socle plastique pour le phare HG"},
        {"idPiece": 38, "nomPiece": "Kit fixation", "description": "Kit à livrer avec le HG"},
        {"idPiece": 39, "nomPiece": "Fil ", "description": "Fil à ajouter au PH à l'emballage"},
    ]

    # Création des pièces
    nouvelles_pieces = []
    for p in pieces_a_creer:
        if not db.query(Piece).filter_by(idPiece=p["idPiece"]).first():
            nouvelles_pieces.append(Piece(
                idPiece=p["idPiece"],
                nomPiece=p["nomPiece"],
                description=p["description"]
            ))

    if nouvelles_pieces:
        db.bulk_save_objects(nouvelles_pieces)
        print(f"{len(nouvelles_pieces)} pièces créées.")
    else:
        print("Toutes les pièces existent déjà.")

    boites_a_creer = [
        {"idBoite": 6767, "idPiece": 4141, "code_barre": "3601020016223", "nbBoite": 10},
        {"idBoite": 1, "idPiece": 1, "code_barre": "TEST1", "nbBoite": 10},
        {"idBoite": 2, "idPiece": 2, "code_barre": "TEST2", "nbBoite": 10},
        {"idBoite": 3, "idPiece": 3, "code_barre": "TEST3", "nbBoite": 10},
        {"idBoite": 4, "idPiece": 4, "code_barre": "TEST4", "nbBoite": 10},
        {"idBoite": 5, "idPiece": 5, "code_barre": "TEST5", "nbBoite": 10},
        {"idBoite": 6, "idPiece": 6, "code_barre": "TEST6", "nbBoite": 10},
        {"idBoite": 7, "idPiece": 7, "code_barre": "TEST7", "nbBoite": 10},
        {"idBoite": 8, "idPiece": 8, "code_barre": "TEST8", "nbBoite": 10},
        {"idBoite": 9, "idPiece": 9, "code_barre": "TEST9", "nbBoite": 10},
        {"idBoite": 10, "idPiece": 10, "code_barre": "TEST10", "nbBoite": 10},
        {"idBoite": 11, "idPiece": 11, "code_barre": "TEST11", "nbBoite": 10},
        {"idBoite": 12, "idPiece": 12, "code_barre": "TEST12", "nbBoite": 10},
        {"idBoite": 13, "idPiece": 13, "code_barre": "TEST13", "nbBoite": 10},
        {"idBoite": 14, "idPiece": 14, "code_barre": "TEST14", "nbBoite": 10},
        {"idBoite": 15, "idPiece": 15, "code_barre": "TEST15", "nbBoite": 10},
        {"idBoite": 16, "idPiece": 16, "code_barre": "TEST16", "nbBoite": 10},
        {"idBoite": 17, "idPiece": 17, "code_barre": "TEST17", "nbBoite": 10},
        {"idBoite": 18, "idPiece": 18, "code_barre": "TEST18", "nbBoite": 10},
        {"idBoite": 19, "idPiece": 19, "code_barre": "TEST19", "nbBoite": 10},
        {"idBoite": 20, "idPiece": 20, "code_barre": "TEST20", "nbBoite": 10},
        {"idBoite": 21, "idPiece": 21, "code_barre": "TEST21", "nbBoite": 10},
        {"idBoite": 22, "idPiece": 22, "code_barre": "TEST22", "nbBoite": 10},
        {"idBoite": 23, "idPiece": 23, "code_barre": "TEST23", "nbBoite": 10},
        {"idBoite": 24, "idPiece": 24, "code_barre": "TEST24", "nbBoite": 10},
        {"idBoite": 25, "idPiece": 25, "code_barre": "TEST25", "nbBoite": 10},
        {"idBoite": 26, "idPiece": 26, "code_barre": "TEST26", "nbBoite": 10},
        {"idBoite": 27, "idPiece": 27, "code_barre": "TEST27", "nbBoite": 10},
        {"idBoite": 28, "idPiece": 28, "code_barre": "TEST28", "nbBoite": 10},
        {"idBoite": 29, "idPiece": 29, "code_barre": "TEST29", "nbBoite": 10},
        {"idBoite": 30, "idPiece": 30, "code_barre": "TEST30", "nbBoite": 10},
        {"idBoite": 31, "idPiece": 31, "code_barre": "TEST31", "nbBoite": 10},
        {"idBoite": 32, "idPiece": 32, "code_barre": "TEST32", "nbBoite": 10},
        {"idBoite": 33, "idPiece": 33, "code_barre": "TEST33", "nbBoite": 10},
        {"idBoite": 34, "idPiece": 34, "code_barre": "TEST34", "nbBoite": 10},
        {"idBoite": 35, "idPiece": 35, "code_barre": "TEST35", "nbBoite": 10},
        {"idBoite": 36, "idPiece": 36, "code_barre": "TEST36", "nbBoite": 10},
        {"idBoite": 37, "idPiece": 37, "code_barre": "TEST37", "nbBoite": 10},
        {"idBoite": 38, "idPiece": 38, "code_barre": "TEST38", "nbBoite": 10},
        {"idBoite": 39, "idPiece": 39, "code_barre": "TEST39", "nbBoite": 10}
    ]

    # Création des boîtes
    nouvelles_boites = []
    for b in boites_a_creer:
        if not db.query(Boite).filter_by(idPiece=b["idPiece"]).first():
            nouvelles_boites.append(Boite(
                idBoite=b["idBoite"],
                code_barre=b["code_barre"],
                nbBoite=b["nbBoite"],
                idPiece=b["idPiece"]
            ))

    if nouvelles_boites:
        db.bulk_save_objects(nouvelles_boites)
        print(f"{len(nouvelles_boites)} boîtes créées.")
    else:
        print("Toutes les boîtes existent déjà.")

    db.commit()
    db.close()

    Stand_a_creer =[
        {"idStand": 1, "nomStand": "Stand 1"},
        {"idStand": 2, "nomStand": "Stand 2"},
        {"idStand": 3, "nomStand": "Stand 3"},
        {"idStand": 4, "nomStand": "Stand 4"},
        {"idStand": 5, "nomStand": "Poste 1"},
        {"idStand": 6, "nomStand": "Poste 2"},
        {"idStand": 7, "nomStand": "Poste 3"},
    ]

    # Création des boîtes
    nouveaux_Stands = []
    for m in Stand_a_creer:
        if not db.query(Stand).filter_by(idStand=m["idStand"]).first():
            nouveaux_Stands.append(Stand(
                idStand=m["idStand"],
                nomStand=m["nomStand"]
            ))

    if nouveaux_Stands:
        db.bulk_save_objects(nouveaux_Stands)
        print(f"{len(nouveaux_Stands)} Stands créés.")
    else:
        print("Toutes les Stands existent déjà.")

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
    db.close()

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
    db.close()

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