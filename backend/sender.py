#!/usr/bin/env python3
"""
sender.py - Multi-zapettes vers serveur FastAPI (HTTP)
Fonctionne sur un poste unique ou plusieurs Raspberry.
 - Détecte les zapettes USB-COM
 - Attribue un ID simple : 1, 2, 3...
 - Envoie les codes-barres au serveur FastAPI (endpoint /scan)
"""

import threading
import time
import serial
import serial.tools.list_ports
import requests

SERVER_HOST = "http://127.0.0.1:8000"
SCAN_ENDPOINT = f"{SERVER_HOST}/scan"
READ_TIMEOUT = 1.0
RECONNECT_DELAY = 2.0

def send_scan(barcode, device_id):
    """Envoie un code-barres scanné au serveur FastAPI via HTTP"""
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
        print(f"[EXC] Erreur envoi (zapette {device_id}): {e}")

def serial_reader_thread(port_info, device_id):
    """Lit les scans sur un port série sans utiliser in_waiting (contournement bug driver)"""
    port_name = port_info.device
    print(f"[INFO] Thread zapette {device_id} démarré sur {port_name}")
    
    while True:
        try:
            # On garde la désactivation DTR/RTS par sécurité
            ser = serial.Serial()
            ser.port = port_name
            ser.baudrate = 9600
            ser.timeout = 0.5  # Timeout court pour rendre la boucle réactive
            ser.dsrdtr = False
            ser.rtscts = False
            
            ser.open()
            
            with ser:
                print(f"[OPEN] {port_name} ouvert (zapette {device_id})")
                buffer = b""
                
                while True:
                    # --- MODIFICATION CRITIQUE ---
                    # Au lieu de demander 'if ser.in_waiting:', on lit directement 1 octet.
                    # Grâce au timeout, si rien n'arrive, cela renvoie b'' sans planter.
                    try:
                        chunk = ser.read(1) 
                    except serial.SerialException:
                        raise # On remonte l'erreur si la lecture plante vraiment (déconnexion)

                    if chunk:
                        buffer += chunk
                        # Si on a reçu un caractère, on essaie d'en lire d'autres immédiatement
                        # pour ne pas attendre le timeout entre chaque caractère.
                        # On utilise un read safe s'il y a d'autres données qui suivent.
                        while True:
                            # Petite astuce : on tente de lire le reste sans timeout bloquant
                            # mais sans utiliser in_waiting qui bug chez vous.
                            ser.timeout = 0.05 
                            more = ser.read(128)
                            if not more:
                                ser.timeout = 0.5 # On remet le timeout normal
                                break
                            buffer += more

                        # Analyse du buffer
                        if b"\r" in buffer or b"\n" in buffer:
                            try:
                                barcode = buffer.decode("utf-8", errors="ignore").strip()
                            except:
                                barcode = ""
                            
                            buffer = b"" # Reset
                            
                            if barcode:
                                send_scan(barcode, device_id)
                    
                    # Pas de else/sleep ici, le ser.read(1) avec timeout fait office de sleep
                    
        except serial.SerialException as e:
            print(f"[WARN] Erreur série sur {port_name}: {e}")
            time.sleep(RECONNECT_DELAY)
            
        except Exception as e:
            print(f"[EXC] Erreur inattendue sur {port_name}: {e}")
            time.sleep(RECONNECT_DELAY)
            
def discover_and_start_listeners():
    """Découvre les zapettes USB-COM et lance un thread par port détecté"""
    ports = serial.tools.list_ports.comports()
    if not ports:
        print("[INFO] Aucune zapette détectée.")
        return []

    print(f"[INFO] {len(ports)} zapette(s) détectée(s).")

    threads = []
    for idx, p in enumerate(ports, start=1):
        t = threading.Thread(target=serial_reader_thread, args=(p, idx), daemon=True)
        t.start()
        threads.append(t)
        print(f"[INFO] Zapette {idx} assignée au port {p.device}")

    return threads

def main():
    print("[INFO] Sender démarré — détection des zapettes...")
    threads = discover_and_start_listeners()
    if not threads:
        print("[INFO] Aucune zapette connectée. Fin du programme.")
        return

    print("[INFO] En écoute. Ctrl+C pour arrêter.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[INFO] Arrêt du sender.")

if __name__ == "__main__":
    main()
