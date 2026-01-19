#!/bin/bash

# Couleurs
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=========================================="
echo "  TESTS & COVERAGE AVEC EXCLUSIONS"
echo -e "==========================================${NC}"

source venv/bin/activate

# On ajoute le dossier backend au chemin pour les imports
export PYTHONPATH=$PYTHONPATH:$(pwd)/backend

# On lance pytest en lui disant d'utiliser la config de couverture
# Si le fichier .coveragerc existe, il sera pris en compte automatiquement
pytest --cov=. --cov-report=term-missing

echo -e "${CYAN}==========================================${NC}"