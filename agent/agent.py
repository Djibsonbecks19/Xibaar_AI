"""
XIBAAR AI Agent — installé sur les machines de la PME
Lit les logs système et envoie les événements suspects à la plateforme.

Installation :
    pip install tailer requests psutil

Lancement :
    python agent.py
"""

import re
import time
import requests
import psutil
from datetime import datetime

# ── URL de votre plateforme XIBAAR ──
XIBAAR_URL = "http://localhost:8000/api/events"

# ── Fichiers de logs à surveiller (Linux) ──
LOG_FILES = [
    "/var/log/auth.log",
    "/var/log/syslog",
]

# ── Patterns de détection ──
PATTERNS = {
    "brute_force_attempt": {
        "regex":    r"Failed password",
        "severity": "HIGH"
    },
    "unknown_user_attempt": {
        "regex":    r"Invalid user",
        "severity": "MEDIUM"
    },
    "port_scan": {
        "regex":    r"kernel.*SRC=.*DPT=",
        "severity": "MEDIUM"
    },
    "root_login": {
        "regex":    r"session opened for user root",
        "severity": "HIGH"
    },
    "sudo_abuse": {
        "regex":    r"sudo.*FAILED",
        "severity": "HIGH"
    }
}


def extract_ip(line: str) -> str:
    match = re.search(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', line)
    return match.group(1) if match else "unknown"


def send_event(event_type: str, ip: str, raw_log: str, severity: str):
    try:
        requests.post(XIBAAR_URL, json={
            "type":       event_type,
            "source_ip":  ip,
            "timestamp":  datetime.now().isoformat(),
            "raw_log":    raw_log.strip(),
            "severity":   severity
        }, timeout=5)
        print(f"⚠️  [{datetime.now().strftime('%H:%M:%S')}] {event_type} depuis {ip}")
    except Exception as e:
        print(f"❌ Erreur envoi : {e}")


def monitor_logs():
    """Surveille les fichiers de logs en temps réel."""
    import tailer  # pip install tailer

    log_file = None
    for f in LOG_FILES:
        try:
            open(f)
            log_file = f
            break
        except FileNotFoundError:
            continue

    if not log_file:
        print("❌ Aucun fichier de log trouvé. Lancez en mode simulateur.")
        return

    print(f"🛡️  Agent XIBAAR — surveillance de {log_file}")
    for line in tailer.follow(open(log_file)):
        for event_type, config in PATTERNS.items():
            if re.search(config["regex"], line, re.IGNORECASE):
                ip = extract_ip(line)
                send_event(event_type, ip, line, config["severity"])
                break


def monitor_network():
    """Surveille les connexions réseau actives."""
    print("🌐 Surveillance réseau activée...")
    known_connections = set()

    while True:
        try:
            for conn in psutil.net_connections(kind="inet"):
                if conn.status == "ESTABLISHED" and conn.raddr:
                    key = (conn.laddr.port, conn.raddr.ip, conn.raddr.port)
                    if key not in known_connections:
                        known_connections.add(key)
                        hour = datetime.now().hour
                        # Connexion hors horaires (avant 6h ou après 22h)
                        if hour < 6 or hour > 22:
                            send_event(
                                "suspicious_connection",
                                conn.raddr.ip,
                                f"Connexion établie hors horaires vers {conn.raddr.ip}:{conn.raddr.port}",
                                "MEDIUM"
                            )
        except Exception as e:
            print(f"⚠️  Network monitor error: {e}")
        time.sleep(10)


if __name__ == "__main__":
    import threading

    print("=" * 50)
    print("   🛡️  XIBAAR AI Agent démarré")
    print(f"   → Plateforme : {XIBAAR_URL}")
    print("=" * 50)

    # Thread réseau en parallèle
    net_thread = threading.Thread(target=monitor_network, daemon=True)
    net_thread.start()

    # Surveillance des logs (principal)
    monitor_logs()
