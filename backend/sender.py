#!/usr/bin/env python3
"""
sender.py - Multi-zapettes vers serveur FastAPI (HTTP)
Filtre les ports pour ignorer le port interne ttyS0.
"""

import threading
import time
import serial
import serial.tools.list_ports
import requests

# Configuration
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
    """Lit les scans sur un port série"""
    port_name = port_info.device
    print(f"[INFO] Thread zapette {device_id} démarré sur {port_name}")
    
    while True:
        try:
            ser = serial.Serial()
            ser.port = port_name
            ser.baudrate = 9600
            ser.timeout = 0.5
            ser.dsrdtr = False
            ser.rtscts = False
            ser.open()
            
            with ser:
                print(f"[OPEN] {port_name} ouvert (zapette {device_id})")
                buffer = b""
                while True:
                    chunk = ser.read(1) 
                    if chunk:
                        buffer += chunk
                        ser.timeout = 0.05 
                        more = ser.read(128)
                        if more:
                            buffer += more
                        ser.timeout = 0.5

                        if b"\r" in buffer or b"\n" in buffer:
                            barcode = buffer.decode("utf-8", errors="ignore").strip()
                            buffer = b""
                            if barcode:
                                send_scan(barcode, device_id)
        except Exception:
            time.sleep(RECONNECT_DELAY)
            
def discover_and_start_listeners():
    """Découvre uniquement les zapettes USB (ACM ou USB) et ignore ttyS0"""
    all_ports = serial.tools.list_ports.comports()
    
    # --- MODIFICATION ICI : On filtre pour ne garder que l'USB réel ---
    ports = [p for p in all_ports if "ttyS0" not in p.device and ("ACM" in p.device or "USB" in p.device)]
    
    if not ports:
        print("[INFO] Aucune zapette USB détectée.")
        return []

    print(f"[INFO] {len(ports)} zapette(s) physique(s) détectée(s).")

    threads = []
    for idx, p in enumerate(ports, start=1):
        t = threading.Thread(target=serial_reader_thread, args=(p, idx), daemon=True)
        t.start()
        threads.append(t)
        print(f"[INFO] Zapette {idx} assignée au port {p.device}")

    return threads

def main():
    print("[INFO] Sender démarré — détection des zapettes USB uniquement...")
    threads = discover_and_start_listeners()
    if not threads:
        print("[INFO] Fin du programme (aucune zapette).")
        return

    print("[INFO] En écoute. Ctrl+C pour arrêter.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[INFO] Arrêt du sender.")

if __name__ == "__main__":
    main()