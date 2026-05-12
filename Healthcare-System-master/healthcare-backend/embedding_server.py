"""
HealthPulse Embedding Server
=============================
FastAPI server for generating embeddings using sentence-transformers.

Run:
    python embedding_server.py

Or with uvicorn:
    uvicorn embedding_server:app --host 0.0.0.0 --port 8001 --reload

Test:
    curl -X POST http://localhost:8001/embed \
      -H "Content-Type: application/json" \
      -d '{"text":"patient has fever and cough"}'
"""

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI(title="HealthPulse Embedding Server", version="1.0.0")

# Load model once at startup
model = SentenceTransformer("all-MiniLM-L6-v2")


class EmbedInput(BaseModel):
    text: str


class EmbedOutput(BaseModel):
    embedding: list


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/embed", response_model=EmbedOutput)
def embed(input: EmbedInput):
    """Generate embedding for input text."""
    print(f"Generated embedding for input: {input.text}")
    embedding = model.encode(input.text, normalize_embeddings=True).tolist()    
    return {"embedding": embedding}


if __name__ == "__main__":
    uvicorn.run(
        "embedding_server:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
    )
