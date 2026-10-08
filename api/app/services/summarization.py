# api/app/services/summarization.py
# Combines spoken and visual analysis tracks into a structured analysis.

import json
import logging

from pydantic import BaseModel, ConfigDict, Field, field_validator
from langchain_groq import ChatGroq

from app.config.settings import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Structured analysis schema
# ─────────────────────────────────────────────────────────────
class Analysis(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    overview: str = Field(description="2-4 sentence overview")
    tldr: str = Field(description="One-line TL;DR, under 200 chars")
    content_summary: str = Field(
        description=(
            "What was discussed or shown, 4-8 sentences. "
            "MUST be a flat plain text string paragraph, not an array/list of strings."
        )
    )
    key_points: list[str] = Field(description="3-7 concrete key points")
    topics: list[str] = Field(description="3-8 topic tags")
    tone: str = Field(
        description="Overall tone: formal, casual, tense, warm, energetic, etc."
    )
    emotions: list[str] = Field(description="Emotional cues, 0-6 entries")
    behaviour_notes: list[str] = Field(
        description="Non-verbal cues, speaker dynamics, engagement signals (0-8)",
        validation_alias="behavior_notes",
    )
    sentiment: str = Field(description="positive | neutral | negative | mixed")

    @field_validator("content_summary", mode="before")
    @classmethod
    def ensure_string_paragraph(cls, v):
        if isinstance(v, list):
            return " ".join(str(item).strip() for item in v)
        return str(v)


_analysis_model = ChatGroq(
    model="openai/gpt-oss-120b",
    api_key=settings.GROQ_API_KEY,
    temperature=0.2,
).with_structured_output(Analysis)

_chat_model = ChatGroq(
    model="openai/gpt-oss-120b",
    api_key=settings.GROQ_API_KEY,
    temperature=0.7,
)

_ANALYSIS_SYSTEM = """You are a professional media analyst.
Analyze the provided content and populate the structured analysis schema.

CRITICAL INSTRUCTIONS:
1. 'content_summary' MUST be a single plain text paragraph string. Never return a JSON list or array for it.
2. Base your analysis ONLY on the data provided: the spoken transcript, the visual frame analysis, and the title/metadata.
3. If a spoken transcript is provided, treat it as the primary source of what was said.
4. If no transcript is provided, say so plainly in the analysis (for example: "No spoken audio was transcribed") and rely on the visual data and title. Do NOT invent dialogue, lyrics, or audio content that you were not given.
5. A visual analysis typically covers a single frame, so do not claim to know what happens across the whole video from it.
6. You MUST respond by populating the structured analysis schema."""


def analyze(
    *,
    title: str,
    kind: str,
    source_type: str,
    transcript: str | None,
    diarization: list[dict] | None,
    image_info: dict | None = None,
    transcript_error: str | None = None,
) -> dict:
    sections: list[str] = []

    if transcript and transcript.strip():
        sections.append(f"Spoken Audio Transcript:\n{transcript.strip()}")
    else:
        reason = transcript_error or "No speech was detected."
        sections.append(f"Spoken Audio Transcript:\n[Not available: {reason}]")

    if image_info and image_info.get("transcript"):
        sections.append(f"Visual Frame Analysis:\n{image_info['transcript']}")

    content_payload = "\n\n".join(sections)

    user_prompt = (
        f"Title: {title}\n"
        f"Media Kind: {kind}\n"
        f"Source Pipeline: {source_type}\n\n"
        f"Content:\n{content_payload}\n"
    )

    try:
        return _analysis_model.invoke(
            [("system", _ANALYSIS_SYSTEM), ("user", user_prompt)]
        ).model_dump()
    except Exception as e:
        logger.exception("Analysis generation failed")
        return {
            "overview": f"Error generating analysis: {e}",
            "tldr": "Failed",
            "content_summary": "Analysis could not be generated.",
            "key_points": [],
            "topics": [],
            "tone": "neutral",
            "emotions": [],
            "behaviour_notes": [],
            "sentiment": "neutral",
        }


def answer_question(*, session: dict, question: str) -> str:
    transcript_context = session.get("transcript") or "[No spoken transcript available]"
    image_context = session.get("image_info")

    if image_context and isinstance(image_context, dict):
        visual_desc = image_context.get("transcript") or ""
        transcript_context = (
            f"{transcript_context}\n\n[Visual Frame Context]:\n{visual_desc}"
        )

    analysis_context = json.dumps(session.get("analysis", {}), indent=2)

    system_prompt = (
        "You are an AI assistant helping a user explore details about a media item they analyzed.\n"
        "Answer the question accurately using ONLY the provided text. "
        "If the answer is not in the provided text, say so.\n\n"
        f"Media Title: {session.get('title', 'Untitled')}\n"
        f"Analysis:\n{analysis_context}\n\n"
        f"Primary Data Feed:\n{transcript_context}"
    )

    response = _chat_model.invoke([("system", system_prompt), ("user", question)])
    return str(response.content)