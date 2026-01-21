@echo off
TITLE Kanban Numerique - Setup et Sender
SETLOCAL EnableDelayedExpansion
COLOR 0A

echo ==========================================
echo   DETECTION DE L'ADRESSE IP
echo ==========================================

:: Extraction de l'IP locale (IPv4)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    set IP_RAW=%%a
    set IP=!IP_RAW: =!
    goto :found_ip
)

:found_ip
echo Adresse IP detectee : %IP%

:: --- CONFIGURATION DES FICHIERS .ENV ---
echo [0/5] Mise a jour des fichiers .env...
echo VITE_API_URL=http://%IP%:8000 > frontend\.env
echo BACKEND_URL=http://%IP%:8000 > backend\.env

echo ==========================================
echo   INSTALLATION DES DEPENDANCES
echo ==========================================

:: --- ÉTAPE 1 : INSTALLATION BACKEND ---
if not exist "venv" (
    echo [1/5] Creation de l'environnement virtuel...
    python -m venv venv
)
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
:: /k permet de garder la fenetre ouverte en cas d'erreur
echo [3/5] Ouverture du terminal Backend FastAPI...
start "BACKEND - FastAPI" cmd /k "cd ../backend && call ..\venv\Scripts\activate && uvicorn server:app --host 0.0.0.0 --port 8000"

:: --- ÉTAPE 4 : LANCEMENT FRONTEND (NOUVELLE FENETRE) ---
echo [4/5] Ouverture du terminal Frontend React...
start "FRONTEND - React" cmd /k "cd ../frontend && npm run dev -- --host"

:: --- ÉTAPE 5 : LANCEMENT SENDER (FENETRE ACTUELLE) ---
echo [5/5] Lancement du script Sender ...
cd ../backend
python fake_zap.py

pause