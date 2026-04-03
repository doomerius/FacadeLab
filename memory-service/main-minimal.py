from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os

app = FastAPI(title="Palkia Memory Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.environ.get("MEMORY_API_KEY", "palkia-memory-2026")

def verify_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

class MemoryIn(BaseModel):
    content: str
    type: str = "insight"
    tags: List[str] = []
    visibility: str = "private"
    importance: int = 3

@app.post("/memories")
def ingest(memory: MemoryIn, _: str = Depends(verify_key)):
    return {"id": 1, "content": memory.content, "type": memory.type, "status": "stored"}

@app.get("/public")
def public_memories():
    return []

@app.get("/health")
def health():
    return {"status": "ok", "mode": "minimal"}
