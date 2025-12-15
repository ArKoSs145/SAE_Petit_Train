from datetime import datetime
from web_interface.backend.database import Commande

def formater_log(commande: Commande):
    heure = commande.dateCommande.strftime("%H:%M:%S le %d/%m/%Y")
    nom_piece = commande.boite.piece.nomPiece
    num_commande = commande.idCommande

    if commande.statutCommande == "A récupérer":
        return (
            f"Le {commande.poste.nomStand} a commandé "
            f"(commande n°{num_commande}) "
            f"une boîte de {nom_piece} à {heure}"
        )

    elif commande.statutCommande == "A déposer":
        return (
            f"Le petit train a récupéré la commande n°{num_commande} "
            f"au {commande.magasin.nomStand} à {heure}"
        )

    elif commande.statutCommande == "Commande finie":
        return (
            f"Le petit train a livré la commande n°{num_commande} "
            f"au {commande.poste.nomStand} à {heure}"
        )
