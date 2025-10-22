#!/usr/bin/env python3
"""
sender.py - Multi-scanner sender (numérotation simple 1, 2, 3)
 - Détecte les zapettes USB-COM (et HID si dispo)
 - Attribue un ID simple : 1, 2, 3... selon l’ordre détecté
 - Envoie "id:barcode" au receiver
"""

import threading
import time
import socket
import serial
import serial.tools.list_ports
import traceback

# HID support (optionnel)
try:
    import hid
    HID_AVAILABLE = True
except ImportError:
    HID_AVAILABLE = False

SERVER_HOST = "127.0.0.1"  # à modifier si receiver sur une autre machine
SERVER_PORT = 5555
READ_TIMEOUT = 1.0
RECONNECT_DELAY = 2.0


def send_scan(barcode, device_id):
    """Envoie un code scanné au serveur"""
    payload = f"{device_id}:{barcode}"
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(5)
            s.connect((SERVER_HOST, SERVER_PORT))
            s.sendall(payload.encode("utf-8"))
        print(f"[SEND] {payload}")
    except Exception as e:
        print(f"[ERROR] Échec d’envoi au serveur: {e}")


def serial_reader_thread(port_info, device_id):
    """Lit les scans sur un port série donné et envoie au receiver"""
    port_name = port_info.device
    print(f"[INFO] Thread zapette {device_id} démarré sur {port_name}")
    while True:
        try:
            with serial.Serial(port_name, baudrate=9600, timeout=READ_TIMEOUT) as ser:
                print(f"[OPEN] {port_name} ouvert (zapette {device_id})")
                while True:
                    line = ser.readline()
                    if not line:
                        continue
                    try:
                        text = line.decode("utf-8", errors="ignore").strip()
                    except Exception:
                        text = repr(line)
                    if text:
                        send_scan(text, device_id)
        except serial.SerialException as e:
            if "permission" in str(e).lower():
                print(f"[PERM] Accès refusé à {port_name}. Ajoutez l’utilisateur au groupe dialout. ({e})")
                time.sleep(RECONNECT_DELAY)
            else:
                print(f"[ERROR] Port {port_name} indisponible: {e}")
                time.sleep(RECONNECT_DELAY)
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

    # Attribuer les ID : 1, 2, 3...
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
