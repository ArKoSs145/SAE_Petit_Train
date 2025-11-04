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
    emplacements = relationship("Emplacement", back_populates="boite")


# Table des magasins
class Magasin(Base):
    __tablename__ = "magasins"
    idMagasin = Column(Integer, primary_key=True)
    nomMagasin = Column(String)

    emplacements = relationship("Emplacement", back_populates="magasin")


# Table des emplacements
class Emplacement(Base):
    __tablename__ = "emplacements"
    idEmplacement = Column(Integer, primary_key=True)
    idMagasin = Column(Integer, ForeignKey("magasins.idMagasin"))
    idBoite = Column(Integer, ForeignKey("boites.idBoite"))
    ligne = Column(Integer)
    colonne = Column(Integer)

    __table_args__ = (
        UniqueConstraint('idMagasin', 'ligne', 'colonne', name="uq_case_par_magasin"),
    )

    boite = relationship("Boite", back_populates="emplacements")
    magasin = relationship("Magasin", back_populates="emplacements")

# Table des commandes
class Commande(Base):
    __tablename__ = "commandes"
    idCommande = Column(Integer, primary_key=True, index=True)
    idBoite = Column(Integer, ForeignKey("boites.idBoite"))
    idMagasin = Column(Integer, ForeignKey("magasins.idMagasin"))
    dateCommande = Column(DateTime, default=datetime.utcnow)

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

    magasin_a_creer =[
        {"idMagasin": 1, "nomMagasin": "Magasin A"},
        {"idMagasin": 2, "nomMagasin": "Magasin B"},
        {"idMagasin": 3, "nomMagasin": "Magasin C"},
        {"idMagasin": 4, "nomMagasin": "Magasin D"},
        {"idMagasin": 5, "nomMagasin": "Magasin E"},
    ]

    # Création des boîtes
    nouveaux_magasins = []
    for m in magasin_a_creer:
        if not db.query(Magasin).filter_by(idMagasin=m["idMagasin"]).first():
            nouveaux_magasins.append(Magasin(
                idMagasin=m["idMagasin"],
                nomMagasin=m["nomMagasin"]
            ))

    if nouveaux_magasins:
        db.bulk_save_objects(nouveaux_magasins)
        print(f"{len(nouveaux_magasins)} magasins créés.")
    else:
        print("Toutes les magasins existent déjà.")

    db.commit()
    db.close()
    
    # Création des emplacements dans chaque magasin
    emplacement_a_creer = [
        {"idEmplacement": 1, "idMagasin": 1, "idBoite": 1, "ligne": 1, "colonne": 1},
        {"idEmplacement": 2, "idMagasin": 1, "idBoite": 2, "ligne": 1, "colonne": 2},
        {"idEmplacement": 3, "idMagasin": 1, "idBoite": 3, "ligne": 2, "colonne": 1},
        {"idEmplacement": 4, "idMagasin": 2, "idBoite": 4, "ligne": 1, "colonne": 1},
        {"idEmplacement": 5, "idMagasin": 2, "idBoite": 5, "ligne": 1, "colonne": 2}
    ]

    # Création des emplacements
    nouveaux_emplacements = []
    for e in emplacement_a_creer:
        if not db.query(Emplacement).filter_by(idEmplacement=e["idEmplacement"]).first():
            nouveaux_emplacements.append(Emplacement(
                idEmplacement=e["idEmplacement"],
                idMagasin=e["idMagasin"],
                idBoite=e["idBoite"],
                ligne=e["ligne"],
                colonne=e["colonne"]
            ))

    if nouveaux_emplacements:
        db.bulk_save_objects(nouveaux_emplacements)
        print(f"{len(nouveaux_emplacements)} emplacements créés.")
    else:
        print("Toutes les emplacements existent déjà.")

    db.commit()
    db.close()

    # # Création de commandes exemples
    # commandes_a_creer = [
    #     {"idCommande": 1, "idBoite": 1, "idMagasin": 1},
    #     {"idCommande": 2, "idBoite": 2, "idMagasin": 1},
    #     {"idCommande": 3, "idBoite": 3, "idMagasin": 2},
    #     {"idCommande": 4, "idBoite": 4, "idMagasin": 3},
    #     {"idCommande": 5, "idBoite": 5, "idMagasin": 3},
    # ]

    # nouvelle_commandes = []

    # for c in commandes_a_creer:
    #     exist = db.query(Commande).filter_by(idCommande=c["idCommande"]).first()
    #     if not exist:
    #         nouvelle_commandes.append(Commande(
    #             idCommande=c["idCommande"],
    #             idBoite=c["idBoite"],
    #             idMagasin=c["idMagasin"]

    #         ))

    # if nouvelle_commandes:
    #     db.bulk_save_objects(nouvelle_commandes)
    #     print(f"{len(nouvelle_commandes)} commandes créées.")
    # else:
    #     print("Toutes les commandes existent déjà.")

    # db.commit()
    # db.close()