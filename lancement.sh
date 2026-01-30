#!/bin/bash

# Configuration des couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BASE_DIR="/home/admin/SAE_Petit_Train"

echo -e "${CYAN}=========================================="
echo "  DETECTION DE L'ADRESSE IP"
echo -e "==========================================${NC}"

# Extraction de l'IP locale (équivalent Linux du script bat)
# On utilise hostname -I pour Linux ou une commande python pour plus de compatibilité
IP=$(python3 -c "import socket; s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()")

if [ -z "$IP" ]; then
    IP="127.0.0.1"
fi

echo -e "Adresse IP détectée : ${GREEN}$IP${NC}"

# --- CONFIGURATION DES FICHIERS .ENV ---
# Reproduit exactement l'étape [0/5] du .bat
echo "[0/5] Mise à jour des fichiers .env..."
echo "VITE_API_URL=http://$IP:8000" > frontend/.env
echo "BACKEND_URL=http://$IP:8000" > backend/.env

echo -e "${GREEN}=========================================="
echo "  INSTALLATION DES DEPENDANCES"
echo -e "==========================================${NC}"

# --- ÉTAPE 1 : INSTALLATION BACKEND ---
if [ ! -d "$BASE_DIR/venv" ]; then
    echo "[1/5] Création de l'environnement virtuel..."
    python3 -m venv $BASE_DIR/venv
fi

echo "[1/5] Activation du venv et installation Python..."
source $BASE_DIR/venv/bin/activate
cd $BASE_DIR/backend
pip install -r $BASE_DIR/requirements.txt
cd ..

# --- ÉTAPE 2 : INSTALLATION FRONTEND ---
echo "[2/5] Installation des modules Node.js (npm install)..."
cd $BASE_DIR/frontend
npm install
cd ..

echo -e "${BLUE}=========================================="
echo "  LANCEMENT DES SERVICES"
echo -e "==========================================${NC}"

# Fonction pour arrêter les processus à la fermeture
cleanup() {
    echo -e "\n${BLUE}Arrêt des services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

# --- ÉTAPE 3 : LANCEMENT BACKEND ---
echo "[3/5] Lancement du Backend FastAPI (en arrière-plan)..."
source $BASE_DIR/venv/bin/activate
cd $BASE_DIR/backend
# Utilisation de --host 0.0.0.0 pour être accessible via l'IP
uvicorn server:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# --- ÉTAPE 4 : LANCEMENT FRONTEND ---
echo "[4/5] Lancement du Frontend React (en arrière-plan)..."
cd $BASE_DIR/frontend
# Utilisation de --host pour être accessible sur le réseau local
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

# Pause pour laisser les serveurs démarrer
sleep 2

# --- ÉTAPE 5 : LANCEMENT SENDER (FENETRE ACTUELLE) ---
echo -e "${GREEN}[5/5] Lancement du script Sender ...${NC}"
cd $BASE_DIR/backend
source $BASE_DIR/venv/bin/activate
python3 fake_zap.py

# Garde le script actif pour maintenir les PID en arrière-plan
wait