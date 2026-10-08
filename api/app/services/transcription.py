# api/app/services/transcription.py
# Speech-to-text via Groq Whisper.
# - Retries transient failures (rate limits, timeouts, 5xx)
# - Falls back across Whisper models
# - Splits large audio into chunks to stay under Groq's upload limit
# - Always returns {"transcript": str, "language": str|None, "duration": float|None}

import logging
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Optional

from groq import Groq

from app.config.settings import settings
from app.services.media import _find_tool

logger = logging.getLogger(__name__)

WHISPER_MODELS = [
    "whisper-large-v3-turbo",
    "whisper-large-v3",
]

# Groq's upload limit is 25 MB on the free tier; stay safely below it.
MAX_UPLOAD_BYTES = 24 * 1024 * 1024
CHUNK_SECONDS = 600          # 10-minute chunks when splitting
MAX_ATTEMPTS_PER_MODEL = 3
BACKOFF_SECONDS = 2.0

_client: Optional[Groq] = None


def _get_client() -> Groq:
    """Create the Groq client lazily so a bad key can't crash app startup."""
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY, timeout=120.0, max_retries=0)
    return _client


def _read(resp, key: str):
    """Read a field from an SDK object or a dict."""
    if isinstance(resp, dict):
        return resp.get(key)
    return getattr(resp, key, None)


def _transcribe_single(audio_path: Path, language: Optional[str]) -> dict:
    """Transcribe one file, with retries and model fallback."""
    audio_bytes = audio_path.read_bytes()
    last_error: Optional[Exception] = None

    for model in WHISPER_MODELS:
        for attempt in range(1, MAX_ATTEMPTS_PER_MODEL + 1):
            try:
                kwargs = {
                    "file": (audio_path.name, audio_bytes),
                    "model": model,
                    "response_format": "verbose_json",
                    "temperature": 0.0,
                }
                if language:
                    kwargs["language"] = language

                resp = _get_client().audio.transcriptions.create(**kwargs)

                text = (_read(resp, "text") or "").strip()
                logger.info(
                    "Whisper (%s) transcribed %s: %d chars",
                    model, audio_path.name, len(text),
                )
                return {
                    "transcript": text,
                    "language": _read(resp, "language"),
                    "duration": _read(resp, "duration"),
                }

            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Whisper model=%s attempt=%d/%d failed: %s",
                    model, attempt, MAX_ATTEMPTS_PER_MODEL, exc,
                )
                message = str(exc).lower()
                # Errors that retrying the same model will never fix:
                if any(s in message for s in ("invalid api key", "401", "model_not_found",
                                              "does not exist", "decommissioned")):
                    break
                if attempt < MAX_ATTEMPTS_PER_MODEL:
                    time.sleep(BACKOFF_SECONDS * attempt)

    raise RuntimeError(f"All Whisper attempts failed. Last error: {last_error}")


def _split_audio(audio_path: Path, out_dir: Path) -> list[Path]:
    """Split audio into CHUNK_SECONDS-long MP3 chunks using ffmpeg."""
    ffmpeg_bin = _find_tool("ffmpeg")
    pattern = str(out_dir / "chunk_%03d.mp3")

    command = [
        ffmpeg_bin, "-y", "-i", str(audio_path),
        "-f", "segment", "-segment_time", str(CHUNK_SECONDS),
        "-ac", "1", "-ar", "16000", "-b:a", "64k",
        pattern,
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"Could not split audio: {(result.stderr or '')[-500:]}")

    chunks = sorted(out_dir.glob("chunk_*.mp3"))
    if not chunks:
        raise RuntimeError("Audio splitting produced no chunks.")
    return chunks


def transcribe(audio_path, language: Optional[str] = None) -> dict:
    """
    Transcribe an audio file. Raises on hard failure so the caller can
    record transcript_error; returns an empty transcript string if no speech.
    """
    audio_path = Path(audio_path)

    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    size = audio_path.stat().st_size
    if size == 0:
        raise ValueError("Audio file is empty.")

    # Small enough: single request.
    if size <= MAX_UPLOAD_BYTES:
        return _transcribe_single(audio_path, language)

    # Too large: split, transcribe each chunk, stitch together.
    logger.info("Audio is %.1f MB; splitting into chunks.", size / 1024 / 1024)
    work_dir = Path(tempfile.mkdtemp(prefix="whisper_chunks_"))
    try:
        parts: list[str] = []
        total_duration = 0.0
        detected_language = language

        for chunk in _split_audio(audio_path, work_dir):
            res = _transcribe_single(chunk, language or detected_language)
            if res["transcript"]:
                parts.append(res["transcript"])
            if res.get("duration"):
                total_duration += float(res["duration"])
            detected_language = detected_language or res.get("language")

        return {
            "transcript": " ".join(parts).strip(),
            "language": detected_language,
            "duration": total_duration or None,
        }
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)