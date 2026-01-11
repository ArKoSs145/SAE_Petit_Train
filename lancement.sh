#!/bin/bash

# Fonction pour arrêter proprement tous les processus au Ctrl+C
cleanup() {
    echo -e "\n[INFO] Arrêt des services..."
    kill 0
}
trap cleanup EXIT

echo "=========================================="
echo "  INSTALLATION ET LANCEMENT (LINUX / RPI)"
echo "=========================================="

# --- ÉTAPE 1 : INSTALLATION BACKEND ---
echo "[1/5] Activation du venv et installation Python..."
cd backend || exit
# Sous Linux, le chemin du script d'activation est différent 
source ../venv/bin/activate
pip install -r ../requirements.txt

# --- ÉTAPE 2 : INSTALLATION FRONTEND ---
echo "[2/5] Installation des modules Node.js (npm install)..."
cd ../frontend || exit
npm install

echo "=========================================="
echo "       LANCEMENT DES SERVICES"
echo "=========================================="

# --- ÉTAPE 3 : LANCEMENT BACKEND (ARRIÈRE-PLAN) ---
echo "[3/5] Démarrage du Backend FastAPI..."
cd ../backend || exit
# Utilisation de l'hôte 0.0.0.0 pour l'accès réseau 
uvicorn server:app --host 0.0.0.0 --port 8000 & 

# --- ÉTAPE 4 : LANCEMENT FRONTEND (ARRIÈRE-PLAN) ---
echo "[4/5] Démarrage du Frontend React..."
cd ../frontend || exit
npm run dev &

# --- ÉTAPE 5 : LANCEMENT SENDER (PREMIER PLAN) ---
echo "[5/5] Lancement du script Sender (fake_zap.py)..."
cd ../backend || exit
echo "------------------------------------------"
echo "SYSTÈME PRÊT : Appuyez sur Ctrl+C pour tout arrêter."
echo "------------------------------------------"

# On lance le script final au premier plan
python3 fake_zap.py

# Attendre la fin des processus en arrière-plan
wait