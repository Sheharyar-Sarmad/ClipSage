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
    
    # FIXED: Added field alignment mapping so alternative spellings do not cause 400 schema faults
    behaviour_notes: list[str] = Field(
        description="Non-verbal cues, speaker dynamics, engagement signals (0–8)",
        validation_alias="behavior_notes"
    )
    
    notable_quotes: list[str] = Field(description="0–5 memorable quotes")
    sentiment: str = Field(description="positive | neutral | negative | mixed")


# FIXED: Migrated from deprecated engines to active production tokens
_analysis_model = ChatGroq(model="openai/gpt-oss-120b", api_key=settings.GROQ_API_KEY, temperature=0.2).with_structured_output(Analysis)
_chat_model = ChatGroq(model="openai/gpt-oss-120b", api_key=settings.GROQ_API_KEY, temperature=0.7)

_ANALYSIS_SYSTEM = """You are a professional media analyst.
Produce a structured analysis of what is happening: what is being said, tone, emotions, and key takeaways.
Do NOT invent facts. Omit fields if not supported by the input content."""


def analyze(*, title: str, kind: str, source_type: str, transcript: str | None, diarization: list[dict] | None, image_info: dict | None = None) -> dict:
    content_payload = transcript or (image_info.get("transcript") if image_info else None)
    if not content_payload:
        content_payload = "No text transcript or structural visual information extracted."

    user_prompt = f"Title: {title}\nMedia Kind: {kind}\nSource Pipeline: {source_type}\n\nContent:\n{content_payload}\n"
    if diarization: user_prompt += f"Diarization:\n{json.dumps(diarization)}"

    try:
        return _analysis_model.invoke([("system", _ANALYSIS_SYSTEM), ("user", user_prompt)]).model_dump()
    except Exception as e:
        return {"overview": f"Error: {str(e)}", "tldr": "Failed", "content_summary": "", "key_points": [], "action_items": [], "topics": [], "tone": "neutral", "emotions": [], "behaviour_notes": [], "notable_quotes": [], "sentiment": "neutral"}


def answer_question(*, session: dict, question: str) -> str:
    """
    FIXED: Synchronizes image properties and raw content streams 
    together so the chat engine can answer visual questions.
    """
    transcript_context = session.get("transcript")
    image_context = session.get("image_info")
    
    # Merge visual description matrices into primary text context feeds
    if image_context and isinstance(image_context, dict):
        transcript_context = transcript_context or image_context.get("transcript")
        
    analysis_context = json.dumps(session.get("analysis", {}), indent=2)
    
    system_prompt = (
        "You are an AI assistant helping a user explore details about a media item they analyzed.\n"
        "Answer the question accurately using ONLY the provided text logs.\n\n"
        f"Media Title: {session.get('title', 'Untitled')}\n"
        f"Analysis Metadata Matrix:\n{analysis_context}\n\n"
        f"Primary Data Feed Context:\n{transcript_context or 'No raw text context logs logged.'}"
    )
    
    response = _chat_model.invoke([("system", system_prompt), ("user", question)])
    return str(response.content)
