from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
import psycopg2
import os
import uuid

load_dotenv()

# =========================
# ENV
# =========================
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL")
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="XIBAAR AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# SAFE ELASTICSEARCH
# =========================
es = None
if ELASTICSEARCH_URL:
    try:
        es = Elasticsearch(ELASTICSEARCH_URL)
    except Exception as e:
        print("ES ERROR:", e)
        es = None


# =========================
# DB SAFE CONNECT
# =========================
def get_db():
    if not DATABASE_URL:
        return None
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        print("DB CONNECT ERROR:", e)
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
        "elasticsearch": es.ping() if es else False
    }


# =========================
# EVENTS
# =========================
@app.post("/api/events")
async def create_event(event: EventModel):

    data = event.dict()

    # ES
    if es:
        try:
            es.index(index="xibaar-events", document=data)
        except Exception as e:
            print("ES INDEX ERROR:", e)

    # DB
    conn = get_db()
    if conn:
        try:
            with conn.cursor() as cur:

                if data["severity"] == "HIGH":

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
                        str(uuid.uuid4()),
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

    # WS broadcast
    dead = set()

    for client in clients:
        try:
            await client.send_json({"type": "new_event", "data": data})
        except:
            dead.add(client)

    for d in dead:
        clients.discard(d)

    return {"ok": True}


# =========================
# GET EVENTS
# =========================
@app.get("/api/events")
def get_events():

    if not es:
        return []

    try:
        results = es.search(index="xibaar-events", size=50)
        return [h["_source"] for h in results["hits"]["hits"]]
    except:
        return []


# =========================
# INCIDENTS
# =========================
@app.get("/api/incidents")
def get_incidents():

    conn = get_db()
    if not conn:
        return []

    try:
        with conn.cursor() as cur:
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
        print("DB ERROR:", e)
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
            with conn.cursor() as cur:

                cur.execute("SELECT COUNT(*) FROM incidents")
                total_incidents = cur.fetchone()[0]

                cur.execute("SELECT COUNT(*) FROM incidents WHERE severity='HIGH'")
                critiques = cur.fetchone()[0]

                cur.execute("SELECT COUNT(*) FROM incidents WHERE blocked=true")
                ips_bloquees = cur.fetchone()[0]

        except Exception as e:
            print("DB ERROR:", e)

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
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE incidents
                    SET blocked=true
                    WHERE source_ip=%s
                """, (ip,))
                conn.commit()
        except Exception as e:
            print("DB ERROR:", e)
        finally:
            conn.close()

    return {"blocked": ip}


# =========================
# CHAT
# =========================
@app.post("/api/chat")
def chat(data: ChatRequest):
    return {"response": f"[XIBAAR AI] Analyse: {data.text} → OK"}


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