# api/app/services/summarization.py

import json

from pydantic import BaseModel, Field
from langchain_groq import ChatGroq

from app.config.settings import settings


# ─────────────────────────────────────────────────────────────
# Structured analysis schema
# ─────────────────────────────────────────────────────────────
class Analysis(BaseModel):
    overview: str = Field(description="2–4 sentence overview")
    tldr: str = Field(description="One-line TL;DR, under 200 chars")
    content_summary: str = Field(description="What was discussed or shown, 4–8 sentences")
    key_points: list[str] = Field(description="3–7 concrete key points")
    action_items: list[str] = Field(description="Explicit tasks, empty if none")
    topics: list[str] = Field(description="3–8 topic tags")
    tone: str = Field(description="Overall tone: formal, casual, tense, warm, etc.")
    emotions: list[str] = Field(description="Emotional cues, 0–6 entries")
    behaviour_notes: list[str] = Field(
        description="Non-verbal cues, speaker dynamics, engagement signals (0–8)"
    )
    notable_quotes: list[str] = Field(description="0–5 memorable quotes")
    sentiment: str = Field(description="positive | neutral | negative | mixed")


_analysis_model = ChatGroq(
    model="openai/gpt-oss-120b",
    api_key=settings.GROQ_API_KEY,
).with_structured_output(Analysis)


_ANALYSIS_SYSTEM = """You are a professional media analyst.

You will receive:
  • a transcript of audio or video
  • optionally, speaker segments

Produce a structured analysis of what is happening: what is being said,
who is involved, tone, emotions, behavioural or non-verbal cues you can infer,
and the key takeaways.

Rules:
- Do NOT invent facts. Omit anything not supported by the input.
- behaviour_notes should only include what the input supports.
- Keep every field concise and concrete.
"""


def analyze(
    *,
    title: str,
    kind: str,
    source_type: str,
    transcript: str | None,
    diarization: list[dict] | None,
    image_info: dict | None,
) -> dict:
    header = f"Title: {title}\nKind: {kind}\nSource: {source_type}\n"
    parts = [header]

    if transcript:
        parts.append("\n=== TRANSCRIPT ===\n" + transcript[:60000])

    if diarization and isinstance(diarization, list):
        lines = [f"[{s['speaker']}] {s['start']}–{s['end']}s" for s in diarization[:500]]
        parts.append("\n=== SPEAKER SEGMENTS ===\n" + "\n".join(lines))

    if image_info:
        parts.append(
            "\n=== IMAGE ===\n"
            f"Filename: {image_info.get('filename')}\n"
            "(No caption; analyze based on filename and any transcript.)"
        )

    result: Analysis = _analysis_model.invoke(
        [("system", _ANALYSIS_SYSTEM), ("human", "\n".join(parts))]
    )
    return result.model_dump()


# ─────────────────────────────────────────────────────────────
# Follow-up Q&A
# ─────────────────────────────────────────────────────────────
_qa_model = ChatGroq(model="openai/gpt-oss-120b", api_key=settings.GROQ_API_KEY)


_QA_SYSTEM = """You are a helpful assistant answering questions about a specific
piece of media. You have the transcript, speaker segments (if any), and a prior
structured analysis.

Rules:
- Answer using ONLY the provided context.
- If the answer is not present, say so — do not guess.
- Be concise. Cite speaker names or timestamps where useful.
"""


def answer_question(*, session: dict, question: str) -> str:
    parts = [
        f"Title: {session.get('title')}",
        f"Kind: {session.get('kind')}",
        f"Source type: {session.get('source_type')}",
    ]
    if session.get("language"):
        parts.append(f"Language: {session['language']}")
    if session.get("duration"):
        parts.append(f"Duration: {session['duration']} seconds")
    if session.get("transcript"):
        parts.append("=== TRANSCRIPT ===\n" + session["transcript"][:60000])
    if session.get("analysis"):
        parts.append(
            "=== PRIOR ANALYSIS ===\n"
            + json.dumps(session["analysis"], indent=2)[:20000]
        )

    context = "\n\n".join(parts)

    resp = _qa_model.invoke([
        ("system", _QA_SYSTEM),
        ("human", f"CONTEXT:\n{context}\n\nQUESTION: {question}"),
    ])
    return resp.content if isinstance(resp.content, str) else str(resp.content)