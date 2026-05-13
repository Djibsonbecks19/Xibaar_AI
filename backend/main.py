from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
import os
import uuid

# =========================
# LOAD ENV
# =========================
load_dotenv()

ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")

# =========================
# APP
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
# SAFE OPTIONAL IMPORTS
# =========================
try:
    import psycopg2
except Exception as e:
    print("psycopg2 not available:", e)
    psycopg2 = None

# =========================
# SAFE ELASTICSEARCH INIT
# =========================
es = None
try:
    if ELASTICSEARCH_URL:
        es = Elasticsearch(ELASTICSEARCH_URL)
except Exception as e:
    print("Elasticsearch init failed:", e)
    es = None

# =========================
# DB SAFE CONNECT
# =========================
def get_db():
    if not DATABASE_URL or not psycopg2:
        return None
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        print("DB connection failed:", e)
        return None

# =========================
# WEBSOCKETS
# =========================
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
# ROOT
# =========================
@app.get("/")
def root():
    return {
        "status": "XIBAAR AI running",
        "elasticsearch": bool(es and hasattr(es, "ping") and es.ping())
    }

# =========================
# CREATE EVENT
# =========================
@app.post("/api/events")
async def create_event(event: EventModel):

    data = event.dict()

    # ELASTIC SAFE
    if es:
        try:
            es.index(index="xibaar-events", document=data)
        except Exception as e:
            print("Elastic insert error:", e)

    # POSTGRES SAFE
    conn = get_db()
    if conn:
        try:
            cur = conn.cursor()

            if data["severity"] == "HIGH":
                incident_id = str(uuid.uuid4())

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

                cur.execute("""
                    INSERT INTO incidents VALUES (%s,%s,%s,%s,%s,%s)
                """, (
                    incident_id,
                    data["type"],
                    data["source_ip"],
                    data["severity"],
                    False,
                    data["timestamp"]
                ))

                conn.commit()

        except Exception as e:
            print("DB ERROR:", e)

        finally:
            conn.close()

    # WEBSOCKET BROADCAST
    dead = set()

    for client in clients:
        try:
            await client.send_json({
                "type": "new_event",
                "event": data
            })
        except:
            dead.add(client)

    for d in dead:
        clients.discard(d)

    return {"ok": True}

# =========================
# GET EVENTS (ELASTIC)
# =========================
@app.get("/api/events")
def get_events():

    if not es:
        return []

    try:
        results = es.search(index="xibaar-events", size=50)
        return [hit["_source"] for hit in results["hits"]["hits"]]
    except:
        return []

# =========================
# INCIDENTS (POSTGRES)
# =========================
@app.get("/api/incidents")
def get_incidents():

    conn = get_db()
    if not conn:
        return []

    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM incidents ORDER BY timestamp DESC")
        rows = cur.fetchall()

        return [
            {
                "id": r[0],
                "type": r[1],
                "source_ip": r[2],
                "severity": r[3],
                "blocked": r[4],
                "timestamp": r[5]
            }
            for r in rows
        ]

    except Exception as e:
        print("Incidents error:", e)
        return []

    finally:
        conn.close()

# =========================
# STATS
# =========================
@app.get("/api/stats")
def stats():

    total_incidents = critiques = ips_bloquees = 0

    conn = get_db()
    if conn:
        try:
            cur = conn.cursor()

            cur.execute("SELECT COUNT(*) FROM incidents")
            total_incidents = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM incidents WHERE severity='HIGH'")
            critiques = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM incidents WHERE blocked=true")
            ips_bloquees = cur.fetchone()[0]

        except:
            pass
        finally:
            conn.close()

    total_events = 0
    if es:
        try:
            total_events = es.count(index="xibaar-events")["count"]
        except:
            pass

    return {
        "total_incidents": total_incidents,
        "total_events": total_events,
        "critiques": critiques,
        "ips_bloquees": ips_bloquees
    }

# =========================
# BLOCK IP
# =========================
@app.post("/api/block-ip/{ip}")
def block_ip(ip: str):

    conn = get_db()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("""
                UPDATE incidents
                SET blocked=true
                WHERE source_ip=%s
            """, (ip,))
            conn.commit()
        except:
            pass
        finally:
            conn.close()

    return {"blocked": ip}

# =========================
# CHAT (DEMO)
# =========================
@app.post("/api/chat")
def chat(data: ChatRequest):

    return {
        "response": f"[XIBAAR AI] Analyse: {data.text} → OK (demo)"
    }

# =========================
# WEBSOCKET
# =========================
@app.websocket("/ws")
async def ws(websocket: WebSocket):

    await websocket.accept()
    clients.add(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        clients.discard(websocket)