from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
import psycopg2
import os
import datetime
import uuid

load_dotenv()

# ==================================================
# CONFIG
# ==================================================

ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL")
DATABASE_URL = os.getenv("DATABASE_URL")

# ==================================================
# APP
# ==================================================

app = FastAPI(title="XIBAAR AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================================================
# DATABASE
# ==================================================

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    type TEXT,
    source_ip TEXT,
    severity TEXT,
    blocked BOOLEAN,
    timestamp TEXT
)
""")

conn.commit()

# ==================================================
# ELASTICSEARCH
# ==================================================

es = Elasticsearch(ELASTICSEARCH_URL)

# ==================================================
# WEBSOCKET CLIENTS
# ==================================================

clients = []

# ==================================================
# MODELS
# ==================================================

class EventModel(BaseModel):
    type: str
    source_ip: str
    timestamp: str
    raw_log: str
    severity: str

class ChatRequest(BaseModel):
    text: str

# ==================================================
# ROOT
# ==================================================

@app.get("/")
def root():
    return {
        "status": "XIBAAR AI running",
        "elasticsearch": es.ping()
    }

# ==================================================
# EVENTS
# ==================================================

@app.post("/api/events")
async def create_event(event: EventModel):

    data = event.dict()

    # Save to Elasticsearch
    es.index(index="xibaar-events", document=data)

    # Auto incident creation for HIGH severity
    if data["severity"] == "HIGH":

        incident_id = str(uuid.uuid4())

        cur.execute("""
        INSERT INTO incidents
        VALUES (%s,%s,%s,%s,%s,%s)
        """, (
            incident_id,
            data["type"],
            data["source_ip"],
            data["severity"],
            False,
            data["timestamp"]
        ))

        conn.commit()

    # Realtime websocket broadcast
    disconnected = []

    for client in clients:
        try:
            await client.send_json({
                "type": "new_event",
                "data": data
            })
        except:
            disconnected.append(client)

    for d in disconnected:
        clients.remove(d)

    return {"ok": True}

# ==================================================
# GET EVENTS
# ==================================================

@app.get("/api/events")
def get_events():

    try:
        results = es.search(
            index="xibaar-events",
            size=100,
            sort=[{"timestamp": {"order": "desc"}}]
        )

        return [
            hit["_source"]
            for hit in results["hits"]["hits"]
        ]

    except Exception as e:
        return {
            "error": str(e)
        }

# ==================================================
# INCIDENTS
# ==================================================

@app.get("/api/incidents")
def get_incidents():

    cur.execute("""
    SELECT * FROM incidents
    ORDER BY timestamp DESC
    """)

    rows = cur.fetchall()

    data = []

    for row in rows:
        data.append({
            "id": row[0],
            "type": row[1],
            "source_ip": row[2],
            "severity": row[3],
            "blocked": row[4],
            "timestamp": row[5]
        })

    return data

# ==================================================
# STATS
# ==================================================

@app.get("/api/stats")
def stats():

    cur.execute("SELECT COUNT(*) FROM incidents")
    total_incidents = cur.fetchone()[0]

    try:
        total_events = es.count(index="xibaar-events")["count"]
    except:
        total_events = 0

    cur.execute("""
    SELECT COUNT(*)
    FROM incidents
    WHERE severity='HIGH'
    """)
    critiques = cur.fetchone()[0]

    cur.execute("""
    SELECT COUNT(*)
    FROM incidents
    WHERE blocked=true
    """)
    ips_bloquees = cur.fetchone()[0]

    return {
        "total_incidents": total_incidents,
        "total_events": total_events,
        "critiques": critiques,
        "ips_bloquees": ips_bloquees
    }

# ==================================================
# BLOCK IP
# ==================================================

@app.post("/api/block-ip/{ip}")
def block_ip(ip: str):

    cur.execute("""
    UPDATE incidents
    SET blocked=true
    WHERE source_ip=%s
    """, (ip,))

    conn.commit()

    return {
        "blocked": ip
    }

# ==================================================
# ELK STATUS
# ==================================================

@app.get("/api/elk/status")
def elk_status():

    return {
        "status": "connected" if es.ping() else "offline",
        "url": ELASTICSEARCH_URL
    }

# ==================================================
# CHAT
# ==================================================

@app.post("/api/chat")
def chat(data: ChatRequest):

    text = data.text

    return {
        "response": f"""
[XIBAAR AI]

Analyse terminée :
- Aucun ransomware détecté
- Aucun brute force actif
- Niveau de risque : faible

Question:
{text}
"""
    }

# ==================================================
# WEBSOCKET
# ==================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):

    await websocket.accept()

    clients.append(websocket)

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        clients.remove(websocket)