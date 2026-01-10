@echo off
TITLE Kanban Unifie - Installation et Lancement
COLOR 0A

echo ==========================================
echo   INSTALLATION DES DEPENDANCES ET LANCEMENT
echo ==========================================

:: --- PARTIE BACKEND ---
echo [1/5] Activation du venv et installation Python...
cd web_interface/backend
call ..\..\venv\Scripts\activate
pip install -r requirements.txt

:: --- PARTIE FRONTEND ---
echo [2/5] Installation des modules Node.js (npm install)...
cd ../frontend
call npm install

:: --- LANCEMENT DES SERVICES ---
echo [3/5] Demarrage du Backend FastAPI...
cd ../backend
:: On lance avec l'hote 0.0.0.0 pour l'acces tablette
start /b cmd /c "uvicorn server:app --host 0.0.0.0 --port 8000"

echo [4/5] Demarrage du Frontend React...
cd ../frontend
start /b cmd /c "npm run dev"

:: --- SCRIPT SENDER ---
echo [5/5] Lancement du script Sender...
cd ../backend
echo ------------------------------------------
echo SYSTEME PRET : Appuyez sur Ctrl+C ou fermez pour arreter.
echo ------------------------------------------
python sender.py

pause