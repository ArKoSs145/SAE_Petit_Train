#!/usr/bin/env python3
"""
display_scans.py - Affiche les code-barres reçus dans le terminal
"""

import socket
from datetime import datetime

# Configuration
HOST = '127.0.0.1'  # localhost
PORT = 5555

def format_scan(barcode, scan_number):
    """Formate joliment l'affichage du scan"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    
    print("\n" + "=" * 70)
    print(f"📦 SCAN #{scan_number}")
    print("=" * 70)
    print(f"🕐 Heure:       {timestamp}")
    print(f"🔢 Code-barres: {barcode}")
    print(f"📏 Longueur:    {len(barcode)} caractères")
    print("=" * 70)

def main():
    print("=" * 70)
    print("🖥️  DISPLAY SCANS - Serveur d'affichage")
    print("=" * 70)
    print(f"🌐 Écoute sur: {HOST}:{PORT}")
    print("\n📝 Instructions:")
    print("  1. Ce serveur attend les scans du listener")
    print("  2. Lancez scanner_listener.py dans un autre terminal")
    print("  3. Les scans s'afficheront ici automatiquement")
    print("  4. Ctrl+C pour arrêter")
    print("\n⏳ En attente de connexions...\n")
    
    scan_count = 0
    
    # Créer le socket serveur
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((HOST, PORT))
        server_socket.listen(5)
        
        print(f"✅ Serveur démarré avec succès!\n")
        
        try:
            while True:
                # Attendre une connexion
                conn, addr = server_socket.accept()
                
                with conn:
                    # Recevoir les données
                    data = conn.recv(1024)
                    
                    if data:
                        barcode = data.decode('utf-8')
                        scan_count += 1
                        format_scan(barcode, scan_count)
                        
        except KeyboardInterrupt:
            print("\n\n👋 Arrêt du serveur...")
            print(f"📊 Total de scans reçus: {scan_count}")

if __name__ == "__main__":
    main()