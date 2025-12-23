import csv
import json
import os
from fastapi import HTTPException
from sqlalchemy.orm import Session
from database import Stand, Boite, Case

def traiter_fichier_config(csv_content: str, stand_id: int, db: Session):
    """
    Traite le fichier CSV pour configurer un stand :
    1. Met à jour le nom du stand (Ligne 1).
    2. Supprime les anciennes cases physiques liées à ce stand.
    3. Analyse la grille (Ligne 2+) pour gérer les fusions et les objets.
    4. Associe logiquement la boîte au magasin ou au poste (selon categorie stand).
    5. Génère le fichier JSON visuel pour le frontend.
    """
    reader = csv.reader(csv_content.splitlines())
    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail="Le fichier CSV est vide.")

    # 1. MISE À JOUR DU NOM ET RÉCUPÉRATION DE LA CATÉGORIE
    stand = db.query(Stand).filter(Stand.idStand == stand_id).first()
    if not stand:
        raise HTTPException(status_code=404, detail="Stand introuvable dans la base de données.")

    nouveau_nom = rows[0][0].strip() if rows[0] else ""
    if nouveau_nom:
        stand.nomStand = nouveau_nom
        db.commit()

    # 2. NETTOYAGE DES ANCIENNES CASES EN BD
    # On supprime les emplacements physiques actuels pour reconstruire la nouvelle grille
    db.query(Case).filter(Case.idStand == stand_id).delete()
    db.commit()

    # 3. PRÉPARATION DE LA GRILLE (Données à partir de la ligne 2)
    grid = []
    for r in rows[1:]:
        cleaned = [cell.strip() for cell in r]
        if any(cleaned):  # On ignore les lignes totalement vides
            grid.append(cleaned)

    nb_rows = len(grid)
    nb_cols = max(len(r) for r in grid) if nb_rows > 0 else 0
    visited = set()
    items_json = []

    # 4. PARCOURS DE LA GRILLE ET ALGORITHME DE FUSION (Flood Fill)
    for r in range(nb_rows):
        for c in range(len(grid[r])):
            if (r, c) in visited or not grid[r][c]:
                continue
            
            val = grid[r][c]
            
            # Flood Fill : on identifie toutes les cellules adjacentes ayant la même valeur
            stack = [(r, c)]
            visited.add((r, c))
            group = []
            while stack:
                curr_r, curr_c = stack.pop()
                group.append((curr_r, curr_c))
                # Vérification des voisins (haut, bas, gauche, droite)
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nr, nc = curr_r + dr, curr_c + dc
                    if 0 <= nr < nb_rows and 0 <= nc < len(grid[nr]):
                        if grid[nr][nc] == val and (nr, nc) not in visited:
                            visited.add((nr, nc))
                            stack.append((nr, nc))

            # Calcul des coordonnées de départ et de l'étalement (span)
            rs, cs = [p[0] for p in group], [p[1] for p in group]
            row_start, col_start = min(rs) + 1, min(cs) + 1
            row_span, col_span = max(rs) - min(rs) + 1, max(cs) - min(cs) + 1

            # LOGIQUE MÉTIER : Case "X" (vide) ou Code-barre (objet)
            is_empty = (val.upper() == "X")
            display_val = "" if is_empty else val
            
            if not is_empty:
                # On cherche la boîte correspondante par son code-barre
                boite = db.query(Boite).filter(Boite.code_barre == val).first()
                if boite:
                    # A. Création de la case physique en BD (Position L/C)
                    db.add(Case(
                        idStand=stand_id,
                        idBoite=boite.idBoite,
                        ligne=row_start,
                        colonne=col_start
                    ))
                    
                    # B. Mise à jour de l'assignation logique de la boîte
                    # On utilise la catégorie du stand pour savoir quel champ remplir
                    if stand.categorie == 1:  # C'est un Magasin
                        boite.idMagasin = stand_id
                    else:  # C'est un Poste (catégorie 0)
                        boite.idPoste = stand_id

            # Préparation des données pour le fichier JSON visuel
            items_json.append({
                "id": f"{r}-{c}",
                "val": display_val,
                "style": {
                    "gridRow": f"{row_start} / span {row_span}",
                    "gridColumn": f"{col_start} / span {col_span}"
                }
            })

    # Sauvegarde finale des changements (cases et assignations de boîtes)
    db.commit()

    # 5. GÉNÉRATION DU FICHIER JSON POUR LE FRONTEND
    data_json = {
        "layout": {
            "templateRows": f"repeat({nb_rows}, 1fr)",
            "templateColumns": f"repeat({nb_cols}, 1fr)"
        },
        "items": items_json
    }
    
    # Définition du chemin d'enregistrement
    filename = f"etagere_{stand_id}.json"
    public_path = os.path.join("..", "frontend", "public", filename)
    
    # Création du dossier si inexistant
    os.makedirs(os.path.dirname(public_path), exist_ok=True)
    with open(public_path, 'w', encoding='utf-8') as f:
        json.dump(data_json, f, indent=2)

    return {
        "status": "ok", 
        "message": f"Le stand '{stand.nomStand}' a été mis à jour avec succès."
    }