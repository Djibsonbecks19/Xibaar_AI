import nmap
import socket
import requests
import time
from datetime import datetime

FASTAPI_URL = "http://127.0.0.1:8000/api/events"

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    finally:
        s.close()

def network():
    ip = get_ip()
    return ".".join(ip.split(".")[:3]) + ".0/24"

def send_event(event_type, ip, log, severity="LOW"):

    try:
        requests.post(
            FASTAPI_URL,
            json={
                "type": event_type,
                "source_ip": ip,
                "timestamp": datetime.now().isoformat(),
                "raw_log": log,
                "severity": severity
            },
            timeout=10
        )
    except Exception as e:
        print("API error:", e)

def scan():

    scanner = nmap.PortScanner()
    net = network()

    print("Scanning:", net)

    try:
        scanner.scan(hosts=net, arguments="-sn")
    except:
        return

    for host in scanner.all_hosts():

        # ✅ FIX SAFE HOST CHECK
        try:
            hostname = scanner[host].hostname()
        except:
            hostname = "unknown"

        print(host, hostname)

        send_event("host_discovered", host,
                   f"Host found {hostname}")

        try:
            scanner.scan(host, "1-1024")

            if host not in scanner.all_hosts():
                continue

            if "tcp" in scanner[host]:

                open_ports = []

                for p in scanner[host]["tcp"]:

                    try:
                        if scanner[host]["tcp"][p]["state"] == "open":
                            open_ports.append(p)
                    except:
                        continue

                print("Ports:", open_ports)

        except:
            continue


if __name__ == "__main__":
    while True:
        scan()
        print("sleep 60s...")
        time.sleep(60)