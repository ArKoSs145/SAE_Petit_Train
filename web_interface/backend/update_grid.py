import csv
import json
import os
from sqlalchemy.orm import Session
from database import SessionLocal, Stand, Piece, Boite, Case, Commande, Login, Train, Cycle


def traiter_fichier_config(csv_content: str, db: Session):
    """
    1. Analyse le CSV reçu (sous forme de chaîne de caractères).
    2. Met à jour la BDD (Backend) avec les positions X,Y.
    3. Génère le JSON (Frontend) pour l'affichage visuel.
    """
    
    # --- A. Lecture et Nettoyage du CSV ---
    grid = []
    # on sépare par lignes car csv_content est une longue string
    reader = csv.reader(csv_content.splitlines()) 
    rows = list(reader)
    
    # Détection du nom du poste (ex: "Poste1" sur la première ligne)
    nom_poste = "Inconnu"
    start_row = 0
    
    # Vérification si la première ligne est un titre (ex: "Poste1," ou juste "Poste1")
    if rows and (len(rows[0]) < 2 or (rows[0][0] and "Poste" in rows[0][0])):
        nom_poste = rows[0][0].strip()
        start_row = 1
    
    # Construction de la grille propre (on ignore les lignes vides)
    for r in rows[start_row:]:
        cleaned = [c.strip() for c in r if c.strip()]
        if cleaned: 
            grid.append(cleaned)
            
    nb_rows = len(grid)
    nb_cols = max(len(r) for r in grid) if nb_rows > 0 else 0

    print(f"[CONFIG] Traitement pour {nom_poste} : {nb_rows}x{nb_cols}")

    # --- B. Récupération ou Création du Stand (Magasin) en BDD ---
    stand = db.query(Stand).filter(Stand.nomStand == nom_poste).first()
    if not stand:
        stand = Stand(nomStand=nom_poste)
        db.add(stand)
        db.commit()
        db.refresh(stand)

    # (Optionnel) Nettoyage préventif : si tu veux que le CSV soit la seule vérité, 
    # tu peux décommenter les 2 lignes suivantes pour supprimer les anciennes cases de ce stand.
    # db.query(Case).filter(Case.idStand == stand.idStand).delete()
    # db.commit()
    
    # --- C. Algorithme de Fusion (Flood Fill) + Mise à jour BDD ---
    visited = set()
    items_json = [] # Liste qui servira à générer le fichier JSON
    
    for r in range(nb_rows):
        # Attention, les lignes CSV peuvent avoir des longueurs différentes
        col_limit = len(grid[r])
        for c in range(col_limit):
            if (r, c) in visited: 
                continue
            
            val = grid[r][c] # Le Code Barre (ex: "768")
            
            # 1. Algorithme Flood Fill pour trouver les cases fusionnées
            stack = [(r, c)]
            visited.add((r, c))
            group = []
            
            while stack:
                curr_r, curr_c = stack.pop()
                group.append((curr_r, curr_c))
                # Voisins : Haut, Bas, Gauche, Droite
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nr, nc = curr_r + dr, curr_c + dc
                    if 0 <= nr < nb_rows and 0 <= nc < len(grid[nr]):
                        if grid[nr][nc] == val and (nr, nc) not in visited:
                            visited.add((nr, nc))
                            stack.append((nr, nc))
            
            # 2. Calcul de la géométrie (Rectangle englobant)
            rs = [p[0] for p in group]
            cs = [p[1] for p in group]
            
            # +1 car CSS Grid et l'Humain comptent à partir de 1
            row_start = min(rs) + 1
            col_start = min(cs) + 1
            row_span = max(rs) - min(rs) + 1
            col_span = max(cs) - min(cs) + 1
            
            # 3. MISE À JOUR BDD (Positions X,Y)
            # a. Trouver ou créer la Boite
            boite = db.query(Boite).filter(Boite.code_barre == val).first()
            if not boite:
                boite = Boite(code_barre=val)
                db.add(boite)
                db.commit()
                db.refresh(boite)
            
            # b. Trouver ou créer la Case associée
            case_db = db.query(Case).filter(Case.idBoite == boite.idBoite).first()
            if not case_db:
                case_db = Case(idBoite=boite.idBoite, idStand=stand.idStand)
                db.add(case_db)
            else:
                # Si la case existe déjà, on s'assure qu'elle est bien sur ce stand
                case_db.idStand = stand.idStand
            
            # c. Mettre à jour les coordonnées
            case_db.ligne = row_start
            case_db.colonne = col_start
            db.commit()

            # 4. Ajout à la liste pour le JSON
            items_json.append({
                "id": f"{r}-{c}",
                "r": r, 
                "c": c,
                "val": val,
                "isMerged": (row_span > 1 or col_span > 1),
                "style": {
                    "gridRow": f"{row_start} / span {row_span}",
                    "gridColumn": f"{col_start} / span {col_span}"
                }
            })

    # --- D. Génération et Écriture du JSON ---
    data_json = {
        "layout": {
            "templateRows": f"repeat({nb_rows}, 1fr)",
            "templateColumns": f"repeat({nb_cols}, 1fr)"
        },
        "items": items_json
    }
    
    # Chemin vers le dossier public du React
    json_path = os.path.join("web_interface", "frontend", "public", "etagere.json")
    
    # Création du dossier si nécessaire
    os.makedirs(os.path.dirname(json_path), exist_ok=True)
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data_json, f, indent=2)
        
    return {"status": "ok", "message": f"Configuration mise à jour pour {nom_poste}"}