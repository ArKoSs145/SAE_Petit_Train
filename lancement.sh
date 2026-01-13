#!/bin/bash

# Configuration des couleurs pour le terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # Pas de couleur

echo -e "${GREEN}=========================================="
echo "  INSTALLATION DES DEPENDANCES (FENETRE PRINCIPALE)"
echo -e "==========================================${NC}"

# --- ÉTAPE 0 : VÉRIFICATION VENV ---
if [ ! -d "venv" ]; then
    echo "[0/5] Création de l'environnement virtuel..."
    python3 -m venv venv
fi

# --- ÉTAPE 1 : INSTALLATION BACKEND ---
echo "[1/5] Activation du venv et installation Python..."
# Note : Sous Linux/Mac, le chemin est venv/bin/activate
source venv/bin/activate
cd backend
pip install -r ../requirements.txt
cd ..

# --- ÉTAPE 2 : INSTALLATION FRONTEND ---
echo "[2/5] Installation des modules Node.js (npm install)..."
cd frontend
npm install
cd ..

echo -e "${BLUE}=========================================="
echo "  LANCEMENT DES SERVICES"
echo -e "==========================================${NC}"

# Fonction pour arrêter les processus en arrière-plan à la fermeture du script
cleanup() {
    echo -e "\n${BLUE}Arrêt des services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

# --- ÉTAPE 3 : LANCEMENT BACKEND ---
echo "[3/5] Lancement du Backend FastAPI (en arrière-plan)..."
source venv/bin/activate
cd backend
uvicorn server:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# --- ÉTAPE 4 : LANCEMENT FRONTEND ---
echo "[4/5] Lancement du Frontend React (en arrière-plan)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Petite pause pour laisser les services démarrer
sleep 2

# --- ÉTAPE 5 : LANCEMENT SENDER (FENETRE ACTUELLE) ---
echo -e "${GREEN}[5/5] Lancement du script Sender ...${NC}"
cd backend
source ../venv/bin/activate
python3 fake_zap.py

# Garde le script actif pour maintenir les processus en arrière-plan
echo "Appuyez sur Ctrl+C pour arrêter tous les services."
wait