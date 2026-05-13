from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

# =========================
# APP INIT (ALWAYS SAFE)
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
es = None
db_error = None

# try elasticsearch safely
try:
    from elasticsearch import Elasticsearch
    ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL")

    if ELASTICSEARCH_URL:
        es = Elasticsearch(ELASTICSEARCH_URL)

except Exception as e:
    print("Elasticsearch disabled:", e)
    es = None

# try postgres safely
try:
    import psycopg2
except Exception as e:
    print("Postgres disabled:", e)
    psycopg2 = None

DATABASE_URL = os.getenv("DATABASE_URL")


def get_db():
    if not DATABASE_URL or not psycopg2:
        return None
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        print("DB connect error:", e)
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
# ROOT (CRITICAL HEALTH CHECK)
# =========================
@app.get("/")
def root():
    return {
        "status": "XIBAAR AI running",
        "elasticsearch": es is not None
    }


# =========================
# SIMPLE TEST ENDPOINT
# =========================
@app.get("/health")
def health():
    return {"ok": True}


# =========================
# EVENTS (SAFE MODE)
# =========================
@app.post("/api/events")
async def create_event(event: EventModel):

    data = event.dict()

    # ES safe
    if es:
        try:
            es.index(index="xibaar-events", document=data)
        except Exception as e:
            print("ES error:", e)

    # DB safe
    conn = get_db()
    if conn:
        try:
            conn.close()
        except:
            pass

    # websocket safe
    dead = set()

    for c in clients:
        try:
            await c.send_json({"type": "new_event", "data": data})
        except:
            dead.add(c)

    for d in dead:
        clients.discard(d)

    return {"ok": True}


# =========================
# CHAT (SAFE)
# =========================
@app.post("/api/chat")
def chat(data: ChatRequest):
    return {"response": f"[XIBAAR AI] OK: {data.text}"}


# =========================
# WEBSOCKET SAFE
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