#!/usr/bin/env python3
"""
fake_sender.py - Simulateur de zapettes pour tests FastAPI
Permet de saisir manuellement : <ID> <CODE_BARRE>
Exemple :
    1 ABC12345
    3 99887766
"""

import requests
import traceback

SERVER_HOST = "http://127.0.0.1:8000"
SCAN_ENDPOINT = f"{SERVER_HOST}/scan"

def send_scan(barcode, device_id):
    """Envoie un code-barres simulé au serveur FastAPI"""
    payload = {"code_barre": barcode, "poste": device_id}
    try:
        res = requests.post(SCAN_ENDPOINT, json=payload, timeout=3)
        if res.ok:
            print(f"[SEND ✅] Zapette {device_id} → {barcode}")
        else:
            print(f"[ERROR ❌] {res.status_code}: {res.text}")
    except requests.exceptions.ConnectionError:
        print(f"[⚠️] Serveur injoignable ({SCAN_ENDPOINT})")
    except Exception as e:
        print(f"[EXC] Erreur envoi : {e}")
        traceback.print_exc()

def main():
    print("[INFO] Simulateur de zapettes démarré.")
    print("[INFO] Format : <ID> <CODE_BARRE>  — Ctrl+C pour quitter\n")

    while True:
        try:
            line = input("> ").strip()

            if not line:
                print("[ERREUR] Ligne vide, format attendu : <ID> <CODE_BARRE>")
                continue

            parts = line.split(maxsplit=1)
            if len(parts) != 2:
                print("[ERREUR] Format incorrect. Exemple : 2 ABC12345")
                continue

            device_id_str, barcode = parts

            if not device_id_str.isdigit():
                print("[ERREUR] L'ID doit être un nombre. Exemple : 1 ABC123")
                continue

            device_id = int(device_id_str)

            if not barcode:
                print("[ERREUR] Code-barres vide.")
                continue

            send_scan(barcode, device_id)

        except KeyboardInterrupt:
            print("\n[INFO] Arrêt du simulateur.")
            break
        except Exception as e:
            print(f"[EXC] Erreur inattendue : {e}")
            traceback.print_exc()

if __name__ == "__main__":
    main()
