@echo off
TITLE Kanban Numérique - Setup et Sender
COLOR 0A

echo ==========================================
echo   INSTALLATION DES DEPENDANCES (FENETRE PRINCIPALE)
echo ==========================================

:: --- ÉTAPE 1 : INSTALLATION BACKEND ---
echo [1/5] Activation du venv et installation Python...
cd backend
call ..\venv\Scripts\activate
pip install -r ../requirements.txt

:: --- ÉTAPE 2 : INSTALLATION FRONTEND ---
echo [2/5] Installation des modules Node.js (npm install)...
cd ../frontend
call npm install

echo ==========================================
echo   OUVERTURE DES TERMINAUX DE SERVICE
echo ==========================================

:: --- ÉTAPE 3 : LANCEMENT BACKEND (NOUVELLE FENETRE) ---
:: /k permet de garder la fenêtre ouverte même en cas d'erreur
echo [3/5] Ouverture du terminal Backend FastAPI...
start "BACKEND - FastAPI" cmd /k "cd ../backend && call ..\venv\Scripts\activate && uvicorn server:app --host 0.0.0.0 --port 8000"

:: --- ÉTAPE 4 : LANCEMENT FRONTEND (NOUVELLE FENETRE) ---
echo [4/5] Ouverture du terminal Frontend React...
start "FRONTEND - React" cmd /k "cd ../frontend && npm run dev"

:: --- ÉTAPE 5 : LANCEMENT SENDER (FENETRE ACTUELLE) ---
echo [5/5] Lancement du script Sender ...
cd ../backend

python fake_zap.py

pause