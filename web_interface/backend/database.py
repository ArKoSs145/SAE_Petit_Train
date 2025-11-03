from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, PrimaryKeyConstraint
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
    qteBoite = Column(Integer)

    piece = relationship("Piece", back_populates="boite")
    emplacements = relationship("Emplacement", back_populates="boite")


# Table des emplacements
class Emplacement(Base):
    __tablename__ = "emplacements"
    idEmplacement = Column(Integer, primary_key=True)
    idBoite = Column(Integer, ForeignKey("boites.idBoite"))
    ligne = Column(Integer)
    colonne = Column(Integer)

    boite = relationship("Boite", back_populates="emplacements")
    magasins = relationship("Magasin", back_populates="emplacement")



# Table des magasins
class Magasin(Base):
    __tablename__ = "magasins"
    idMagasin = Column(Integer, primary_key=True)  # clé primaire
    idEmplacement = Column(Integer, ForeignKey("emplacements.idEmplacement"), primary_key=True)
    nomMagasin = Column(String)

    emplacement = relationship("Emplacement", back_populates="magasins")


# Table des commandes
class Commande(Base):
    __tablename__ = "commandes"
    idCommande = Column(Integer, primary_key=True, index=True)
    idBoite = Column(Integer, ForeignKey("boites.idBoite"))
    idMagasin = Column(Integer, ForeignKey("magasins.idMagasin"))
    dateCommande = Column(DateTime, default=datetime.utcnow)



def init_db():
    Base.metadata.create_all(bind=engine)