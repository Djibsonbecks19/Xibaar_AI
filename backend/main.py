from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

# =========================
# APP INIT
# =========================
app = FastAPI(title="XIBAAR AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# OPTIONAL SERVICES
# =========================
es = None

try:
    from elasticsearch import Elasticsearch
    ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL")
    if ELASTICSEARCH_URL:
        es = Elasticsearch(ELASTICSEARCH_URL)
except:
    es = None

# =========================
# IN-MEMORY DATABASE (FIX)
# =========================
incidents = []
events_store = []

clients = set()

# =========================
# MODELS
# =========================
class EventModel(BaseModel):
    type: str
    source_ip: str
    timestamp: str
    raw_log: str
    severity: str


class ChatRequest(BaseModel):
    text: str


# =========================
# HEALTH
# =========================
@app.get("/")
def root():
    return {
        "status": "XIBAAR AI running",
        "elasticsearch": es is not None
    }


@app.get("/health")
def health():
    return {"ok": True}


# =========================
# EVENTS (CORE FIXED)
# =========================
@app.post("/api/events")
async def create_event(event: EventModel):

    data = event.dict()

    # store event
    events_store.append(data)

    # convert to incident (IMPORTANT FIX)
    incident = {
        **data,
        "id": len(incidents) + 1,
        "blocked": False,
        "status": "OPEN",
        "ai_analysis": {}
    }

    incidents.append(incident)

    # send to elasticsearch if available
    if es:
        try:
            es.index(index="xibaar-events", document=data)
        except Exception as e:
            print("ES error:", e)

    # websocket broadcast (FIXED FORMAT)
    dead = set()

    for c in clients:
        try:
            await c.send_json({
                "type": "new_event",
                "event": data
            })
        except:
            dead.add(c)

    for d in dead:
        clients.discard(d)

    return {"ok": True}


# =========================
# INCIDENTS (FIXED)
# =========================
@app.get("/api/incidents")
def get_incidents():
    return incidents


# =========================
# STATS (FIXED)
# =========================
@app.get("/api/stats")
def get_stats():

    total = len(incidents)
    blocked = len([i for i in incidents if i.get("blocked")])
    critiques = len([i for i in incidents if i.get("severity") == "HIGH"])

    return {
        "total_incidents": total,
        "total_events": len(events_store),
        "ips_bloquees": blocked,
        "critiques": critiques
    }


# =========================
# BLOCK IP (FIXED)
# =========================
@app.post("/api/block-ip/{ip}")
def block_ip(ip: str):

    for i in incidents:
        if i["source_ip"] == ip:
            i["blocked"] = True
            i["status"] = "RESOLVED"

    return {"ok": True}


# =========================
# CHAT (OK)
# =========================
@app.post("/api/chat")
def chat(data: ChatRequest):
    return {
        "response": f"[XIBAAR AI] OK: {data.text}"
    }


# =========================
# ELK STATUS (FIXED)
# =========================
@app.get("/api/elk/status")
def elk_status():
    return {
        "status": "connected" if es else "disconnected",
        "version": "8.x" if es else None
    }


# =========================
# ELK SEARCH (FIXED SAFE)
# =========================
@app.get("/api/elk/search")
def elk_search(q: str = "*", size: int = 20):

    if not es:
        return []

    try:
        res = es.search(
            index="xibaar-events",
            query={"query_string": {"query": q}},
            size=size
        )

        return [
            hit["_source"]
            for hit in res["hits"]["hits"]
        ]

    except Exception as e:
        print("ELK error:", e)
        return []


# =========================
# WEBSOCKET (FIXED)
# =========================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):

    await websocket.accept()
    clients.add(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        clients.discard(websocket)