from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import os

# =========================
# APP INIT
# =========================
app = FastAPI(title="XIBAAR AI SOC")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# ELASTICSEARCH (OPTIONAL BUT PRIMARY)
# =========================
es = None
try:
    from elasticsearch import Elasticsearch
    ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
    es = Elasticsearch(ELASTICSEARCH_URL)
except:
    es = None

# =========================
# MEMORY (FALLBACK ONLY)
# =========================
clients = set()

# =========================
# MODELS
# =========================
class EventModel(BaseModel):
    type: str
    source_ip: str
    timestamp: str | None = None
    raw_log: str
    severity: str


class ChatRequest(BaseModel):
    text: str


# =========================
# ROOT
# =========================
@app.get("/")
def root():
    return {
        "status": "XIBAAR SOC API",
        "elasticsearch": es is not None
    }


@app.get("/health")
def health():
    return {"ok": True}


# =========================
# EVENT INGESTION (MAIN FIX)
# =========================
@app.post("/api/events")
async def create_event(event: EventModel):

    timestamp = event.timestamp or datetime.utcnow().isoformat()

    log = {
        "type": event.type,
        "source_ip": event.source_ip,
        "timestamp": timestamp,
        "raw_log": event.raw_log,
        "severity": event.severity
    }

    # =========================
    # SEND TO LOGSTASH/ELK (PRIMARY PIPELINE)
    # =========================
    if es:
        try:
            index_name = f"xibaar-logs-{datetime.utcnow().strftime('%Y.%m.%d')}"

            es.index(
                index=index_name,
                document=log
            )

        except Exception as e:
            print("ELK ERROR:", e)

    # =========================
    # REAL-TIME WEBSOCKET BROADCAST
    # =========================
    dead = set()

    for c in clients:
        try:
            await c.send_json({
                "type": "new_event",
                "data": log
            })
        except:
            dead.add(c)

    for d in dead:
        clients.discard(d)

    return {"ok": True, "stored": log}


# =========================
# EVENTS (READ FROM ELK - FIXED)
# =========================
@app.get("/api/events")
def get_events(size: int = 50):

    if not es:
        return {"error": "Elasticsearch not connected"}

    try:
        res = es.search(
            index="xibaar-logs-*",
            size=size,
            query={"match_all": {}},
            sort=[{"timestamp": {"order": "desc"}}]
        )

        return [hit["_source"] for hit in res["hits"]["hits"]]

    except Exception as e:
        print("ELK READ ERROR:", e)
        return []


# =========================
# INCIDENTS (DERIVED FROM ELK LOGIC)
# =========================
@app.get("/api/incidents")
def get_incidents():

    if not es:
        return []

    try:
        res = es.search(
            index="xibaar-logs-*",
            size=100,
            query={
                "bool": {
                    "should": [
                        {"match": {"severity": "HIGH"}},
                        {"match": {"type": "brute_force"}},
                        {"match": {"type": "port_scan"}},
                        {"match": {"type": "sql_injection"}}
                    ]
                }
            }
        )

        incidents = []
        for i, hit in enumerate(res["hits"]["hits"]):
            src = hit["_source"]

            incidents.append({
                "id": i + 1,
                "type": src.get("type"),
                "source_ip": src.get("source_ip"),
                "timestamp": src.get("timestamp"),
                "severity": src.get("severity"),
                "blocked": False,
                "status": "OPEN",
                "raw_log": src.get("raw_log")
            })

        return incidents

    except Exception as e:
        print("INCIDENT ERROR:", e)
        return []


# =========================
# STATS (FROM ELK)
# =========================
@app.get("/api/stats")
def get_stats():

    if not es:
        return {
            "total_incidents": 0,
            "total_events": 0,
            "ips_bloquees": 0,
            "critiques": 0
        }

    try:
        res = es.search(
            index="xibaar-logs-*",
            size=0,
            query={"match_all": {}},
            aggs={
                "critical": {
                    "filter": {"match": {"severity": "HIGH"}}
                }
            }
        )

        return {
            "total_incidents": res["hits"]["total"]["value"],
            "total_events": res["hits"]["total"]["value"],
            "ips_bloquees": 0,
            "critiques": res["aggregations"]["critical"]["doc_count"]
        }

    except Exception as e:
        print("STATS ERROR:", e)
        return {}


# =========================
# BLOCK IP (SOFT VERSION)
# =========================
@app.post("/api/block-ip/{ip}")
def block_ip(ip: str):

    # In real SOC → firewall / Windows Defender / iptables
    print(f"[BLOCKED IP] {ip}")

    return {"ok": True, "ip": ip}


# =========================
# CHAT (AI PLACEHOLDER)
# =========================
@app.post("/api/chat")
def chat(data: ChatRequest):
    return {
        "response": f"[XIBAAR AI SOC] Analyse: {data.text}"
    }


# =========================
# ELK STATUS
# =========================
@app.get("/api/elk/status")
def elk_status():

    if not es:
        return {"status": "disconnected"}

    try:
        info = es.info()
        return {
            "status": "connected",
            "version": info.get("version", {}).get("number")
        }
    except:
        return {"status": "error"}


# =========================
# WEBSOCKET
# =========================
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):

    await ws.accept()
    clients.add(ws)

    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        clients.discard(ws)