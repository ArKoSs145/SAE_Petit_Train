#!/usr/bin/env python3
"""
receiver.py - Serveur TCP qui reçoit les scans et les affiche dans le terminal
"""

import socket
from datetime import datetime

HOST = "0.0.0.0"
PORT = 5555

def format_scan(scan_number, device_id, barcode):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print("\n" + "="*60)
    print(f"📦 SCAN #{scan_number}")
    print("="*60)
    print(f"🕐 Heure:       {timestamp}")
    print(f"💻 Device ID:   {device_id}")
    print(f"🔢 Code-barres: {barcode}")
    print("="*60)

def main():
    scan_count = 0
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((HOST, PORT))
        s.listen(5)
        print(f"[INFO] Serveur en écoute sur {HOST}:{PORT}...")

        try:
            while True:
                conn, addr = s.accept()
                with conn:
                    data = conn.recv(1024)
                    if data:
                        try:
                            decoded = data.decode("utf-8")
                            if ":" in decoded:
                                device_id, barcode = decoded.split(":", 1)
                            else:
                                device_id, barcode = "UNKNOWN", decoded
                            scan_count += 1
                            format_scan(scan_count, device_id, barcode)
                        except Exception as e:
                            print(f"[ERREUR] Impossible de traiter le scan : {e}")
        except KeyboardInterrupt:
            print(f"\n[INFO] Serveur arrêté. Total scans reçus: {scan_count}")

if __name__ == "__main__":
    main()
