#!/usr/bin/env python3
"""
sender.py - Lit les scanners branchés sur des ports série (/dev/ttyUSB* ou /dev/ttyACM*)
et envoie chaque scan avec un ID unique au serveur.
"""

import serial
import serial.tools.list_ports
import socket
import threading

SERVER_HOST = "127.0.0.1"
SERVER_PORT = 5555

def send_scan(barcode, device_id):
    """Envoie le code-barres et l'ID au serveur"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect((SERVER_HOST, SERVER_PORT))
            message = f"{device_id}:{barcode}"
            s.sendall(message.encode("utf-8"))
        print(f"[SEND] {message}")
    except Exception as e:
        print(f"[ERREUR] Impossible d'envoyer au serveur : {e}")

def listen_port(port):
    """Écoute un port série et envoie chaque scan au serveur"""
    device_id = port.device  # On prend le nom du port comme ID unique
    print(f"[INFO] Écoute sur {device_id}")
    try:
        with serial.Serial(port.device, baudrate=9600, timeout=1) as ser:
            buffer = ""
            while True:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    buffer = line  # chaque ligne correspond à un scan
                    send_scan(buffer, device_id)
    except Exception as e:
        print(f"[ERREUR] Port {device_id} : {e}")

def main():
    # Détection automatique de tous les ports USB série
    ports = serial.tools.list_ports.comports()
    if not ports:
        print("[INFO] Aucun scanner détecté sur les ports série.")
        return

    threads = []
    for port in ports:
        t = threading.Thread(target=listen_port, args=(port,), daemon=True)
        t.start()
        threads.append(t)

    print("[INFO] Écouteurs lancés. Ctrl+C pour arrêter.")
    try:
        while True:
            pass
    except KeyboardInterrupt:
        print("\n[INFO] Arrêt demandé.")

if __name__ == "__main__":
    main()
