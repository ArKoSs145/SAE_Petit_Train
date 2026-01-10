#!/bin/bash

# Nettoyage à l'arrêt du script
cleanup() {
    echo -e "\nArrêt des services en cours..."
    kill 0
}
trap cleanup EXIT

echo "=========================================="
echo "  INSTALLATION ET LANCEMENT (LINUX / RPI) "
echo "=========================================="

# --- BACKEND ---
echo "[1/5] Installation des dépendances Python..."
cd web_interface/backend
source ../../venv/bin/activate
pip install -r requirements.txt

# --- FRONTEND ---
echo "[2/5] Installation des modules npm..."
cd ../frontend
npm install

# --- EXECUTION ---
echo "[3/5] Démarrage du Backend..."
cd ../backend
# Lancement avec host 0.0.0.0 pour la visibilité réseau
uvicorn server:app --host 0.0.0.0 --port 8000 & 

echo "[4/5] Démarrage du Frontend..."
cd ../frontend
npm run dev &

echo "[5/5] Démarrage du Sender..."
cd ../backend
python3 sender.py &

echo "------------------------------------------"
echo "Services démarrés. Accès tablette possible via l'IP du RPi."
echo "Appuyez sur Ctrl+C pour tout couper."
echo "------------------------------------------"

wait