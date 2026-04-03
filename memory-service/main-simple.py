from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import json
import time
import os
from datetime import datetime

app = FastAPI(title="Palkia Memory Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.environ.get("MEMORY_API_KEY", "palkia-memory-2026")
DB_PATH = "/data/memory.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs("/data", exist_ok=True)
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'insight',
            tags TEXT NOT NULL DEFAULT '[]',
            entities TEXT NOT NULL DEFAULT '[]',
            visibility TEXT NOT NULL DEFAULT 'private',
            importance INTEGER NOT NULL DEFAULT 3,
            source TEXT,
            date TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

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

def row_to_out(row) -> MemoryOut:
    return MemoryOut(
        id=row["id"],
        content=row["content"],
        type=row["type"],
        tags=json.loads(row["tags"]),
        entities=json.loads(row["entities"]),
        visibility=row["visibility"],
        importance=row["importance"],
        source=row["source"],
        date=row["date"],
        created_at=row["created_at"],
    )

@app.post("/memories", response_model=MemoryOut)
def ingest(memory: MemoryIn, _: str = Depends(verify_key)):
    date = memory.date or datetime.utcnow().strftime("%Y-%m-%d")
    conn = get_db()
    cur = conn.execute(
        """INSERT INTO memories (content, type, tags, entities, visibility, importance, source, date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (memory.content, memory.type, json.dumps(memory.tags), json.dumps(memory.entities),
         memory.visibility, memory.importance, memory.source, date, int(time.time()))
    )
    conn.commit()
    row = conn.execute("SELECT * FROM memories WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return row_to_out(row)

@app.get("/memories", response_model=List[MemoryOut])
def list_memories(
    visibility: Optional[str] = None,
    type: Optional[str] = None,
    limit: int = 50,
    _: str = Depends(verify_key)
):
    conn = get_db()
    where = []
    params = []
    if visibility:
        where.append("visibility = ?")
        params.append(visibility)
    if type:
        where.append("type = ?")
        params.append(type)
    
    where_clause = f"WHERE {' AND '.join(where)}" if where else ""
    rows = conn.execute(
        f"SELECT * FROM memories {where_clause} ORDER BY created_at DESC LIMIT ?",
        params + [limit]
    ).fetchall()
    conn.close()
    return [row_to_out(r) for r in rows]

@app.delete("/memories/{memory_id}")
def delete_memory(memory_id: int, _: str = Depends(verify_key)):
    conn = get_db()
    conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
    conn.commit()
    conn.close()
    return {"deleted": memory_id}

@app.patch("/memories/{memory_id}")
def update_memory(memory_id: int, updates: dict, _: str = Depends(verify_key)):
    allowed = {"content", "type", "tags", "entities", "visibility", "importance"}
    conn = get_db()
    for field, value in updates.items():
        if field not in allowed:
            continue
        if field in ("tags", "entities"):
            value = json.dumps(value)
        conn.execute(f"UPDATE memories SET {field} = ? WHERE id = ?", (value, memory_id))
    conn.commit()
    conn.close()
    return {"updated": memory_id}

@app.get("/patterns")
def patterns(_: str = Depends(verify_key)):
    conn = get_db()
    type_counts = conn.execute(
        "SELECT type, COUNT(*) as count FROM memories GROUP BY type ORDER BY count DESC"
    ).fetchall()
    tag_rows = conn.execute("SELECT tags FROM memories").fetchall()
    conn.close()
    
    tag_counts = {}
    for row in tag_rows:
        for tag in json.loads(row["tags"]):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:20]
    
    return {
        "by_type": {r["type"]: r["count"] for r in type_counts},
        "top_tags": dict(top_tags),
        "total": sum(r["count"] for r in type_counts),
    }

@app.get("/public", response_model=List[MemoryOut])
def public_memories(type: Optional[str] = None, limit: int = 100):
    conn = get_db()
    where = ["visibility = 'public'"]
    params = []
    if type:
        where.append("type = ?")
        params.append(type)
    rows = conn.execute(
        f"SELECT * FROM memories WHERE {' AND '.join(where)} ORDER BY importance DESC, created_at DESC LIMIT ?",
        params + [limit]
    ).fetchall()
    conn.close()
    return [row_to_out(r) for r in rows]

@app.get("/health")
def health():
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM memories").fetchone()[0]
    conn.close()
    return {"status": "ok", "memories": count}

app.mount("/static", StaticFiles(directory="/app/static"), name="static")

@app.get("/", response_class=HTMLResponse)
def public_page():
    with open("/app/static/index.html") as f:
        return f.read()
