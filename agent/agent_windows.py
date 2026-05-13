import requests
import time
from datetime import datetime
import ctypes
import sys

XIBAAR_URL = "http://localhost:8000/api/events"

WINDOWS_EVENTS = {
    4625: {"type": "brute_force_attempt", "severity": "HIGH",   "desc": "Échec de connexion"},
    4648: {"type": "suspicious_login",    "severity": "MEDIUM", "desc": "Connexion avec credentials explicites"},
    4720: {"type": "account_created",     "severity": "HIGH",   "desc": "Nouveau compte créé"},
    4726: {"type": "account_deleted",     "severity": "HIGH",   "desc": "Compte supprimé"},
    4732: {"type": "group_modified",      "severity": "MEDIUM", "desc": "Groupe admin modifié"},
    7045: {"type": "service_installed",   "severity": "HIGH",   "desc": "Nouveau service installé"},
}


# ----------------------------
# ADMIN CHECK (IMPORTANT FIX)
# ----------------------------
def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False


def send_event(event_type, severity, description, source_ip="local"):
    try:
        requests.post(XIBAAR_URL, json={
            "type": event_type,
            "source_ip": source_ip,
            "timestamp": datetime.now().isoformat(),
            "raw_log": description,
            "severity": severity
        }, timeout=5)

        print(f"⚠️ {datetime.now().strftime('%H:%M:%S')} | {event_type} | {severity}")

    except Exception as e:
        print(f"❌ Backend error: {e}")


def monitor_windows_events():
    if not is_admin():
        print("❌ ERROR: Run as Administrator (required for Security logs)")
        sys.exit(1)

    import win32evtlog

    print("🛡️ XIBAAR Agent started (Windows Event Monitor)")
    print("📡 Sending to:", XIBAAR_URL)

    server = "localhost"
    log_type = "Security"

    hand = win32evtlog.OpenEventLog(server, log_type)

    flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ

    seen = set()  # FIX: avoid duplicates

    while True:
        events = win32evtlog.ReadEventLog(hand, flags, 0)

        if events:
            for event in events:
                event_id = event.EventID & 0xFFFF

                # FIX: prevent spam duplicates
                event_key = f"{event.RecordNumber}-{event_id}"
                if event_key in seen:
                    continue
                seen.add(event_key)

                if event_id in WINDOWS_EVENTS:
                    config = WINDOWS_EVENTS[event_id]

                    hour = datetime.now().hour
                    severity = config["severity"]

                    if hour < 6 or hour > 22:
                        severity = "HIGH"

                    send_event(
                        config["type"],
                        severity,
                        f"EventID {event_id} — {config['desc']}"
                    )

        time.sleep(2)


if __name__ == "__main__":
    print("=" * 50)
    print("   🛡️ XIBAAR AI Agent Windows")
    print("   → Real-time Security Monitoring")
    print("=" * 50)

    monitor_windows_events()