"""replace by /web_interface/backend/main.py
"""
import requests
import threading
import time
import socket
import serial
import serial.tools.list_ports
import os
import traceback

SERVER_HOST = "127.0.0.1"  # IP du receiver
SERVER_PORT = 5555
READ_TIMEOUT = 1.0
RECONNECT_DELAY = 2.0

# 🔢 Table de correspondance : chemin → ID
PORT_ID_MAP = {
    "ACM0": 1,
    "ACM1": 2,
    "ACM2": 3,
    # ou mieux : utiliser les liens stables si tu veux baser sur by-id :
    # "usb-Datalogic_Gryphon_GM4100_SN1234-if00-port0": 1,
    # "usb-Datalogic_Gryphon_GM4100_SN5678-if00-port0": 2,
    # "usb-Datalogic_Gryphon_GM4100_SN9012-if00-port0": 3,
}


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
    """Lit les scans sur un port série et envoie au receiver"""
    port_name = port_info.device
    print(f"[INFO] Zapette {device_id} -> {port_name}")
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
            else:
                print(f"[ERROR] Port {port_name} indisponible: {e}")
            time.sleep(RECONNECT_DELAY)
        except Exception as e:
            print(f"[EXC] Erreur inattendue sur {port_name}: {e}")
            traceback.print_exc()
            time.sleep(RECONNECT_DELAY)


def get_stable_name(port):
    """Essaie de trouver un nom stable dans /dev/serial/by-id"""
    by_id_path = "/dev/serial/by-id"
    if not os.path.exists(by_id_path):
        return port.device
    try:
        for entry in os.listdir(by_id_path):
            full_path = os.path.join(by_id_path, entry)
            if os.path.islink(full_path):
                target = os.path.realpath(full_path)
                if port.device in target:
                    return entry  # nom stable trouvé
    except Exception:
        pass
    return port.device


def discover_and_start_listeners():
    """Découvre les zapettes et assigne les IDs selon la table"""
    ports = serial.tools.list_ports.comports()
    threads = []

    if not ports:
        print("[INFO] Aucune zapette détectée.")
        return []

    print(f"[INFO] {len(ports)} zapette(s) détectée(s).")

    for p in ports:
        stable_name = get_stable_name(p)
        # Cherche un ID dans la table
        device_id = None
        for key, val in PORT_ID_MAP.items():
            if key in stable_name or key in p.device:
                device_id = val
                break
        if device_id is None:
            print(f"[WARN] Aucun ID attribué à {stable_name}. Ignoré.")
            continue

        t = threading.Thread(target=serial_reader_thread, args=(p, device_id), daemon=True)
        t.start()
        threads.append(t)
        print(f"[INFO] Zapette {device_id} assignée à {stable_name}")

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

def envoyer_scan(code, poste):
    try:
        requests.post("http://IP_DU_SERVEUR:8000/scan", params={"poste": poste, "code_barre": code})
    except:
        print("⚠ Impossible d'envoyer au serveur")

if __name__ == "__main__":
    main()
