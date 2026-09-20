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
    model="llama-3.3-70b-versatile",
    api_key=settings.GROQ_API_KEY,
    temperature=0.2,
).with_structured_output(Analysis)


_chat_model = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=settings.GROQ_API_KEY,
    temperature=0.7,
)


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
    image_info: dict | None = None,
) -> dict:
    content_payload = transcript or (image_info.get("transcript") if image_info else None)
    if not content_payload:
        content_payload = "No raw transcript text or image descriptions found for this media item."

    user_prompt = (
        f"Title: {title}\n"
        f"Media Kind: {kind}\n"
        f"Source Pipeline: {source_type}\n\n"
        f"Transcript Content:\n{content_payload}\n\n"
    )

    if diarization:
        user_prompt += f"Speaker Diarization Data:\n{json.dumps(diarization, indent=2)}\n"

    try:
        messages = [
            ("system", _ANALYSIS_SYSTEM),
            ("user", user_prompt)
        ]
        structured_output = _analysis_model.invoke(messages)
        return structured_output.model_dump()
    except Exception as exc:
        return {
            "overview": f"An error occurred while compiling analysis: {str(exc)}",
            "tldr": "Analysis generation failed.",
            "content_summary": "Please check backend server logging outputs.",
            "key_points": ["Review system error parameters"],
            "action_items": [],
            "topics": [kind, "error-fallback"],
            "tone": "neutral",
            "emotions": [],
            "behaviour_notes": [],
            "notable_quotes": [],
            "sentiment": "neutral"
        }


def answer_question(*, session: dict, question: str) -> str:
    """
    FIX: Compiles historical analysis context payloads and raw transcript 
    data streams to safely answer user follow-up workspace queries.
    """
    transcript_context = session.get("transcript") or "No transcript text available."
    analysis_context = json.dumps(session.get("analysis", {}), indent=2)
    
    system_prompt = (
        "You are an AI assistant helping a user explore insights about a media item they just analyzed.\n"
        "Answer the question accurately using ONLY the provided context and transcript details.\n"
        "If you do not know the answer based on the text, explicitly say so.\n\n"
        f"Media Title: {session.get('title', 'Untitled')}\n"
        f"Pre-compiled Analysis Context:\n{analysis_context}\n\n"
        f"Full Raw Transcript:\n{transcript_context}"
    )
    
    messages = [
        ("system", system_prompt),
        ("user", question)
    ]
    
    response = _chat_model.invoke(messages)
    return str(response.content)
