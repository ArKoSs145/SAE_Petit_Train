@echo off
TITLE Tests et Coverage avec Exclusions - Kanban Numerique
COLOR 0B

echo ==========================================
echo   LANCEMENT DES TESTS ET COVERAGE (WINDOWS)
echo ==========================================

:: Activation de l'environnement virtuel Windows 
if not exist "venv\Scripts\activate" (
    echo [ERREUR] Environnement virtuel introuvable.
    echo Lancez d'abord lancement.bat.
    pause
    exit
)

call venv\Scripts\activate

:: On definit le PYTHONPATH pour que pytest trouve les modules dans backend/ 
set PYTHONPATH=%PYTHONPATH%;%cd%\backend

echo Execution des tests et calcul de la couverture...
:: L'utilisation de --cov=. permet de prendre en compte le fichier .coveragerc
pytest --cov=. --cov-report=term
echo ==========================================
echo   FIN DES TESTS
echo ==========================================
pause