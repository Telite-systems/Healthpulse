"""
HealthPulse Disease KB — Embedder (Fixed)
==========================================
Uses:
  - Groq API  → LLM summaries (free tier, correct client + model)
  - sentence-transformers → local embeddings (free, no API, no token limits)

WHY local embeddings?
  Neither xAI (Grok) nor Groq provide an embeddings endpoint.
  sentence-transformers runs on your machine — zero cost, zero rate limits.
  The model 'all-MiniLM-L6-v2' produces 384-dim vectors, excellent for
  semantic symptom matching.

Install once:
    pip install groq supabase openpyxl sentence-transformers

Run:
    python embed_diseases.py

NOTE: Keep your API keys out of source code.
      Set them as environment variables or in a .env file.
"""

import os
import time
from dotenv import load_dotenv
from groq import Groq
from supabase import create_client
from sentence_transformers import SentenceTransformer
import openpyxl

load_dotenv()

# ── Credentials (set as env vars — never hardcode) ────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY environment variable is required. Add it to .env or export it in your shell.")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required. Add them to .env or export them in your shell.")

# ── Config ────────────────────────────────────────────────────────────────────
EXCEL_PATH  = "HealthPulse_Disease_KB.xlsx"
SHEET_NAME  = "Disease Knowledge Base"

# Valid Groq free-tier models:
#   "llama3-8b-8192"   — fast, recommended
#   "llama3-70b-8192"  — most capable, slower
#   "gemma2-9b-it"     — good alternative
GROQ_MODEL  = "llama3-8b-8192"

# Local embedding model (downloads ~90MB once, then runs offline)
# Produces 384-dim vectors
EMBED_MODEL = "all-MiniLM-L6-v2"

BATCH_SIZE  = 5    # small batches to respect Groq free TPM limits
RETRY_DELAY = 3

COL = {
    "disease": 1, "category": 2, "symptoms": 3,  "severity": 4,
    "red_flags": 5, "home_care": 6, "otc_meds": 7, "see_doc_if": 8,
    "specialist": 9, "contagious": 10, "notes": 11,
}

# ── Init ──────────────────────────────────────────────────────────────────────
groq_client = Groq(api_key=GROQ_API_KEY)
supabase    = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Loading local embedding model (downloads once ~90MB)...")
embedder = SentenceTransformer(EMBED_MODEL)
VECTOR_DIMS = embedder.get_sentence_embedding_dimension()
print(f"Ready. Vector dims: {VECTOR_DIMS}")


def parse_severity(val) -> int:
    try:
        return int(str(val).split("-")[0].strip()[0])
    except Exception:
        return 1


def build_raw_text(row: dict) -> str:
    parts = [
        f"Disease: {row['disease']}",
        f"Category: {row['category']}",
        f"Symptoms: {row['symptoms']}",
    ]
    if row.get("red_flags"):
        parts.append(f"Emergency signs: {row['red_flags']}")
    if row.get("notes"):
        parts.append(f"Notes: {row['notes']}")
    return ". ".join(parts)


def summarize_with_groq(text: str) -> str:
    """Use Groq to produce a dense natural-language summary for better embedding."""
    prompt = (
        "You are a medical knowledge base assistant. "
        "Rewrite the following disease entry as a single dense paragraph "
        "for semantic search. Include disease name, category, all symptoms "
        "(use both common patient language and medical terms), and emergency "
        "warning signs. Be concise and factual. No extra information.\n\n"
        f"{text}"
    )
    for attempt in range(4):
        try:
            resp = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=300,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            err = str(e).lower()
            if "rate" in err or "429" in err or "limit" in err:
                wait = RETRY_DELAY * (2 ** attempt)
                print(f"    Rate limit — waiting {wait}s (attempt {attempt+1}/4)...")
                time.sleep(wait)
            else:
                print(f"    Groq error attempt {attempt+1}: {e}")
                if attempt == 3:
                    print("    Falling back to raw text.")
                    return text
                time.sleep(RETRY_DELAY)
    return text


def embed_texts(texts: list) -> list:
    """Embed locally — no API, no cost, no rate limits."""
    vectors = embedder.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    return [v.tolist() for v in vectors]


def load_excel_rows() -> list:
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True)
    ws = wb[SHEET_NAME]
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row[0] or str(row[0]).strip() in ("", "Disease", "SEVERITY LEGEND"):
            continue
        rows.append({
            "disease":    str(row[COL["disease"]    - 1] or "").strip(),
            "category":   str(row[COL["category"]   - 1] or "").strip(),
            "symptoms":   str(row[COL["symptoms"]   - 1] or "").strip(),
            "severity":   parse_severity(row[COL["severity"] - 1]),
            "red_flags":  str(row[COL["red_flags"]  - 1] or "").strip(),
            "home_care":  str(row[COL["home_care"]  - 1] or "").strip(),
            "otc_meds":   str(row[COL["otc_meds"]   - 1] or "").strip(),
            "see_doc_if": str(row[COL["see_doc_if"] - 1] or "").strip(),
            "specialist": str(row[COL["specialist"] - 1] or "").strip(),
            "contagious": str(row[COL["contagious"] - 1] or "").strip(),
            "notes":      str(row[COL["notes"]      - 1] or "").strip(),
        })
    wb.close()
    return rows


def main():
    print("=" * 55)
    print("HealthPulse Disease KB — Fixed Embedder")
    print(f"  Summaries : Groq ({GROQ_MODEL})")
    print(f"  Embeddings: local sentence-transformers ({EMBED_MODEL})")
    print(f"  Dimensions: {VECTOR_DIMS}")
    print("=" * 55)

    print(f"\n[1/4] Reading Excel...")
    rows = load_excel_rows()
    print(f"      {len(rows)} diseases found.")

    print("\n[2/4] Clearing old Supabase rows...")
    supabase.table("disease_kb").delete().neq("id", 0).execute()
    print("      Cleared.")

    print(f"\n[3/4] Processing in batches of {BATCH_SIZE}...")
    all_records = []

    for i in range(0, len(rows), BATCH_SIZE):
        batch   = rows[i : i + BATCH_SIZE]
        end_idx = min(i + BATCH_SIZE, len(rows))
        print(f"\n  Batch {i // BATCH_SIZE + 1}: rows {i+1}–{end_idx}")

        raw_texts = [build_raw_text(r) for r in batch]

        summaries = []
        for j, text in enumerate(raw_texts):
            print(f"    Summarising: {batch[j]['disease']}...")
            summaries.append(summarize_with_groq(text))
            time.sleep(0.8)

        print(f"    Embedding {len(summaries)} texts locally (instant)...")
        embeddings = embed_texts(summaries)

        batch_records = [
            {**row, "embedded_text": summary, "embedding": embedding}
            for row, summary, embedding in zip(batch, summaries, embeddings)
        ]

        print(f"    Inserting into Supabase...")
        supabase.table("disease_kb").insert(batch_records).execute()
        all_records.extend(batch_records)

        if end_idx < len(rows):
            print("    Pausing 5s (Groq rate limit safety)...")
            time.sleep(5)

    print("\n" + "=" * 55)
    print(f"Done! {len(all_records)} diseases stored.")
    print("Cost: $0.00 (Groq free + local embeddings)")
    print()
    print("IMPORTANT — update Supabase SQL before querying:")
    print("  ALTER TABLE disease_kb")
    print("    ALTER COLUMN embedding TYPE vector(384);")
    print()
    print("  Also update the match_diseases functions:")
    print("    change vector(1536) → vector(384) in both signatures.")
    print("=" * 55)


if __name__ == "__main__":
    main()