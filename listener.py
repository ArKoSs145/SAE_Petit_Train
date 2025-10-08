#!/usr/bin/env python3
"""
scanner_listener.py - Écoute les scans clavier globalement et les envoie au serveur d'affichage
"""

import keyboard
import socket
import sys

HOST = '127.0.0.1'
PORT = 5555

barcode_buffer = ""

def send_barcode(barcode):
    """Envoie le code-barres scanné au serveur d'affichage"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect((HOST, PORT))
            s.sendall(barcode.encode('utf-8'))
            print(f"\n✅ Envoyé au serveur: {barcode}")
    except ConnectionRefusedError:
        print("\n✗ Impossible de se connecter au serveur d'affichage")
        print("  Assurez-vous que display_scans.py est lancé")
    except Exception as e:
        print(f"\n✗ Erreur: {e}")

def on_key(event):
    """Capture chaque touche pressée globalement"""
    global barcode_buffer

    # On ne prend que les caractères
    if len(event.name) == 1:
        barcode_buffer += event.name
        sys.stdout.write(event.name)
        sys.stdout.flush()
    elif event.name == 'enter':
        if barcode_buffer.strip():
            print(f"\n🔍 Code-barres scanné: {barcode_buffer}")
            send_barcode(barcode_buffer.strip())
            barcode_buffer = ""
    elif event.name == 'esc':
        print("\n👋 Arrêt du listener...")
        sys.exit(0)

def main():
    print("=" * 60)
    print("🎯 SCANNER LISTENER - Écoute globale des scans")
    print("=" * 60)
    print(f"Connexion vers: {HOST}:{PORT}")
    print("\n📝 Instructions:")
    print("  1. Lancez d'abord display_scans.py dans un autre terminal")
    print("  2. Ce script captera les scans même si une autre fenêtre est active")
    print("  3. Appuyez sur ESC pour quitter")
    print("\n⏳ En attente de scans...\n")

    keyboard.on_press(on_key)
    keyboard.wait()  # bloque le thread principal

if __name__ == "__main__":
    main()
