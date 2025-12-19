import csv
import json
import os
from fastapi import HTTPException
from sqlalchemy.orm import Session
from database import Stand # Import du modèle pour la BD

def traiter_fichier_config(csv_content: str, stand_id: int, db: Session):
    reader = csv.reader(csv_content.splitlines())
    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV vide")

    # 1. MISE À JOUR DU NOM DANS LA BD
    stand = db.query(Stand).filter(Stand.idStand == stand_id).first()
    nouveau_nom = rows[0][0].strip() if rows[0] else ""
    if nouveau_nom and stand:
        ancien = stand.nomStand
        stand.nomStand = nouveau_nom
        db.commit() # Sauvegarde réelle
        print(f"\n[BDD] Stand {stand_id} renommé : {ancien} -> {nouveau_nom}")

    # 2. PRÉPARATION DE LA GRILLE (Lignes 2+)
    grid = [ [cell.strip() for cell in r] for r in rows[1:] if any(c.strip() for c in r) ]
    nb_rows = len(grid)
    nb_cols = max(len(r) for r in grid) if nb_rows > 0 else 0
    
    visited = set()
    items_json = []

    print("\n" + "="*50)
    print(f"ANALYSE DE LA GRILLE : {stand.nomStand if stand else stand_id}")
    print("="*50)

    for r in range(nb_rows):
        for c in range(len(grid[r])):
            if (r, c) in visited or not grid[r][c]: continue
            
            val = grid[r][c]
            
            # --- LOGIQUE DE FUSION (FLOOD FILL) ---
            stack = [(r, c)]
            visited.add((r, c))
            group = []
            while stack:
                curr_r, curr_c = stack.pop()
                group.append((curr_r, curr_c))
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nr, nc = curr_r + dr, curr_c + dc
                    if 0 <= nr < nb_rows and 0 <= nc < len(grid[nr]):
                        if grid[nr][nc] == val and (nr, nc) not in visited:
                            visited.add((nr, nc))
                            stack.append((nr, nc))

            # Calcul des dimensions
            rs, cs = [p[0] for p in group], [p[1] for p in group]
            row_start, col_start = min(rs) + 1, min(cs) + 1
            row_span, col_span = max(rs) - min(rs) + 1, max(cs) - min(cs) + 1

            # --- AFFICHAGE TERMINAL DES GRANDES CASES ---
            type_case = "VIDE (X)" if val.upper() == "X" else f"OBJET ({val})"
            if row_span > 1 or col_span > 1:
                print(f"[FUSION] {type_case:<15} | Pos: ({row_start},{col_start}) | Taille: {row_span}x{col_span}")
            else:
                print(f"[SIMPLE] {type_case:<15} | Pos: ({row_start},{col_start})")

            # --- GÉNÉRATION DU VISUEL (JSON) ---
            display_val = "" if val.upper() == "X" else val
            items_json.append({
                "id": f"{r}-{c}",
                "r": r, "c": c,
                "val": display_val,
                "style": {
                    "gridRow": f"{row_start} / span {row_span}",
                    "gridColumn": f"{col_start} / span {col_span}"
                }
            })

    # 3. SAUVEGARDE DU JSON
    data_json = {
        "layout": { "templateRows": f"repeat({nb_rows}, 1fr)", "templateColumns": f"repeat({nb_cols}, 1fr)" },
        "items": items_json
    }
    
    public_path = os.path.join("..", "frontend", "public", f"etagere_{stand_id}.json")
    os.makedirs(os.path.dirname(public_path), exist_ok=True)
    with open(public_path, 'w', encoding='utf-8') as f:
        json.dump(data_json, f, indent=2)

    print("="*50 + "\n")
    return {"status": "ok", "message": f"Nom '{stand.nomStand}' mis à jour et visuel généré."}