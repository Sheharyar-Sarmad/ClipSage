# api/app/services/transcription.py
# Groq Whisper via the groq SDK (transitively installed by langchain-groq).

from pathlib import Path
from groq import Groq

from app.config.settings import settings

_client = Groq(api_key=settings.GROQ_API_KEY)


def transcribe(audio_path: Path) -> dict:
    size_mb = audio_path.stat().st_size / (1024 * 1024)
    if size_mb > 24:
        raise ValueError(f"Audio is {size_mb:.1f} MB; Groq free tier caps at 25 MB.")

    with open(audio_path, "rb") as f:
        resp = _client.audio.transcriptions.create(
            file=(audio_path.name, f.read()),
            model="whisper-large-v3-turbo",
            response_format="verbose_json",
        )

    return {
        "transcript": resp.text,
        "language": getattr(resp, "language", None),
        "duration": getattr(resp, "duration", None),
    }