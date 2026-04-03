"""
Palkia Memory Service — lightweight JSON-based implementation.
No ML dependencies. Semantic search via simple keyword matching.
Embeddings/vector search to be added when GPU is available.
"""
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
import json
import time
import os
from datetime import datetime, timezone

app = FastAPI(title="Palkia Memory Service", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.environ.get("MEMORY_API_KEY", "palkia-memory-2026")
DB_PATH = "/data/memories.json"

def load_db():
    os.makedirs("/data", exist_ok=True)
    if not os.path.exists(DB_PATH):
        with open(DB_PATH, "w") as f:
            json.dump([], f)
    with open(DB_PATH) as f:
        return json.load(f)

def save_db(memories):
    with open(DB_PATH, "w") as f:
        json.dump(memories, f, indent=2)

def verify_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

class MemoryIn(BaseModel):
    content: str
    type: str = "insight"
    tags: List[str] = []
    entities: List[str] = []
    visibility: str = "private"
    importance: int = 3
    source: Optional[str] = None
    date: Optional[str] = None

class MemoryOut(BaseModel):
    id: int
    content: str
    type: str
    tags: List[str]
    entities: List[str]
    visibility: str
    importance: int
    source: Optional[str]
    date: str
    created_at: int

class SearchRequest(BaseModel):
    query: str
    limit: int = 10
    type_filter: Optional[str] = None
    visibility_filter: Optional[str] = None
    min_importance: int = 1

class SearchResult(BaseModel):
    memory: MemoryOut
    score: float

@app.post("/memories", response_model=MemoryOut)
def ingest(memory: MemoryIn, _: str = Depends(verify_key)):
    memories = load_db()
    new_id = max((m["id"] for m in memories), default=0) + 1
    record = {
        "id": new_id,
        "content": memory.content,
        "type": memory.type,
        "tags": memory.tags,
        "entities": memory.entities,
        "visibility": memory.visibility,
        "importance": memory.importance,
        "source": memory.source,
        "date": memory.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": int(time.time()),
    }
    memories.append(record)
    save_db(memories)
    return MemoryOut(**record)

@app.post("/search", response_model=List[SearchResult])
def search(req: SearchRequest, _: str = Depends(verify_key)):
    memories = load_db()
    query_words = set(req.query.lower().split())
    results = []
    for m in memories:
        if m["importance"] < req.min_importance: continue
        if req.type_filter and m["type"] != req.type_filter: continue
        if req.visibility_filter and m["visibility"] != req.visibility_filter: continue
        # Simple keyword score
        text = (m["content"] + " " + " ".join(m["tags"])).lower()
        score = sum(1 for w in query_words if w in text) / max(len(query_words), 1)
        if score > 0:
            results.append((score, m))
    results.sort(key=lambda x: x[0], reverse=True)
    return [SearchResult(memory=MemoryOut(**r), score=round(s, 4)) for s, r in results[:req.limit]]

@app.get("/memories", response_model=List[MemoryOut])
def list_memories(visibility: Optional[str] = None, type: Optional[str] = None, limit: int = 50, _: str = Depends(verify_key)):
    memories = load_db()
    if visibility: memories = [m for m in memories if m["visibility"] == visibility]
    if type: memories = [m for m in memories if m["type"] == type]
    memories.sort(key=lambda m: m["created_at"], reverse=True)
    return [MemoryOut(**m) for m in memories[:limit]]

@app.delete("/memories/{memory_id}")
def delete_memory(memory_id: int, _: str = Depends(verify_key)):
    memories = load_db()
    memories = [m for m in memories if m["id"] != memory_id]
    save_db(memories)
    return {"deleted": memory_id}

@app.patch("/memories/{memory_id}")
def update_memory(memory_id: int, updates: dict, _: str = Depends(verify_key)):
    memories = load_db()
    for m in memories:
        if m["id"] == memory_id:
            for k, v in updates.items():
                if k in {"content", "type", "tags", "entities", "visibility", "importance"}:
                    m[k] = v
    save_db(memories)
    return {"updated": memory_id}

@app.get("/patterns")
def patterns(_: str = Depends(verify_key)):
    memories = load_db()
    type_counts = {}
    tag_counts = {}
    for m in memories:
        type_counts[m["type"]] = type_counts.get(m["type"], 0) + 1
        for t in m["tags"]: tag_counts[t] = tag_counts.get(t, 0) + 1
    return {
        "by_type": type_counts,
        "top_tags": dict(sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:20]),
        "total": len(memories),
    }

@app.get("/public", response_model=List[MemoryOut])
def public_memories(type: Optional[str] = None, limit: int = 100):
    memories = load_db()
    memories = [m for m in memories if m["visibility"] == "public"]
    if type: memories = [m for m in memories if m["type"] == type]
    memories.sort(key=lambda m: (-m["importance"], -m["created_at"]))
    return [MemoryOut(**m) for m in memories[:limit]]

@app.get("/health")
def health():
    memories = load_db()
    return {"status": "ok", "memories": len(memories), "mode": "json-store"}

os.makedirs("/app/static", exist_ok=True)
app.mount("/static", StaticFiles(directory="/app/static"), name="static")

@app.get("/", response_class=HTMLResponse)
def public_page():
    p = "/app/static/index.html"
    if os.path.exists(p):
        with open(p) as f: return f.read()
    return "<h1>Palkia Memory</h1>"
