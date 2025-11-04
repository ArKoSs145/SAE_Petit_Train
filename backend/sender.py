#!/usr/bin/env python3
"""
sender.py - Multi-zapettes vers serveur FastAPI
Fonctionne sur un poste seul ou plusieurs Raspberry.
- Détecte les zapettes USB-COM
- Attribue un ID simple : 1, 2, 3...
- Envoie le code-barres au serveur FastAPI (HTTP)
"""

import threading
import time
import serial
import serial.tools.list_ports
import traceback
import requests

# === CONFIGURATION ===
SERVER_HOST = "http://127.0.0.1:8000"  # Localhost pour les tests
SCAN_ENDPOINT = f"{SERVER_HOST}/scan"   # endpoint FastAPI
READ_TIMEOUT = 1.0
RECONNECT_DELAY = 2.0


def send_scan(barcode, device_id):
    """Envoie un code scanné au serveur FastAPI"""
    payload = {"code_barre": barcode, "poste": device_id}
    try:
        res = requests.post(SCAN_ENDPOINT, json=payload, timeout=3)
        if res.ok:
            print(f"[SEND ✅] Zapette {device_id} → {barcode}")
        else:
            print(f"[ERROR ❌] {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[EXC] Erreur envoi (zapette {device_id}): {e}")


def serial_reader_thread(port_info, device_id):
    """Lit les scans sur un port série et envoie au serveur"""
    port_name = port_info.device
    print(f"[INFO] Thread zapette {device_id} démarré sur {port_name}")
    while True:
        try:
            with serial.Serial(port_name, baudrate=9600, timeout=READ_TIMEOUT) as ser:
                print(f"[OPEN] {port_name} ouvert (zapette {device_id})")
                buffer = b""
                while True:
                    try:
                        if ser.in_waiting:
                            data = ser.read(ser.in_waiting)
                            buffer += data
                            if b"\r" in buffer or b"\n" in buffer:
                                barcode = buffer.decode("utf-8", errors="ignore").strip()
                                buffer = b""
                                if barcode:
                                    send_scan(barcode, device_id)
                        else:
                            time.sleep(0.05)
                    except serial.SerialException as e:
                        print(f"[WARN] Erreur série sur {port_name}: {e}")
                        break
        except Exception as e:
            print(f"[EXC] Erreur inattendue sur {port_name}: {e}")
            traceback.print_exc()
            time.sleep(RECONNECT_DELAY)


def discover_and_start_listeners():
    """Découvre les zapettes et lance un thread par port"""
    threads = []
    ports = serial.tools.list_ports.comports()

    if not ports:
        print("[INFO] Aucune zapette détectée.")
        return []

    print(f"[INFO] {len(ports)} zapette(s) détectée(s).")

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
