# api/app/routes/process.py
# Ingest media (file or URL) → transcribe → analyze → create session.

import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.routes import make_router
from app.services import media, session, summarization, transcription

router = make_router("process")


@router.post("")
async def process(
    file: UploadFile | None = File(None),
    url: str | None = Form(None),
    title: str | None = Form(None),
):
    """
    Accept a file (audio / video / image) OR a URL.
    Returns a full analysis and a session_id you must use for /chat.
    """
    if not file and not url:
        raise HTTPException(400, "Provide either 'file' (upload) or 'url' (link).")
    if file and url:
        raise HTTPException(400, "Provide 'file' or 'url', not both.")

    work_dir = Path(tempfile.mkdtemp())
    cleanup: list[Path] = []

    try:
        # ─── 1. Bring the media onto disk ───────────────────────
        if file:
            suffix = Path(file.filename or "upload").suffix
            raw_path = work_dir / f"upload{suffix}"
            raw_path.write_bytes(await file.read())
            cleanup.append(raw_path)

            display_title = title or Path(file.filename or "Untitled").stem
            source = file.filename
            source_type = "upload"
            kind = media.detect_kind(raw_path)

        else:
            raw_path, meta = media.download_from_url(url)
            cleanup.append(raw_path)
            display_title = title or meta.get("title") or "Untitled"
            source = url
            source_type = (
                "youtube" if ("youtube.com" in url or "youtu.be" in url) else "url"
            )
            kind = media.detect_kind(raw_path)

        # ─── 2. Branch by media type ────────────────────────────
        if kind == "image":
            image_info = media.describe_image(raw_path)
            transcript = None
            diarization = None
            language = None
            duration = None

        else:
            audio_path = media.extract_audio(raw_path)
            cleanup.append(audio_path)

            tr = transcription.transcribe(audio_path)
            transcript = tr["transcript"]
            language = tr.get("language")
            duration = tr.get("duration")

            try:
                diarization = transcription.diarize(audio_path)
            except Exception as exc:
                diarization = {"error": str(exc)}

            image_info = None

        # ─── 3. Rich analysis ──────────────────────────────────
        analysis = summarization.analyze(
            title=display_title,
            kind=kind,
            source_type=source_type,
            transcript=transcript,
            diarization=diarization,
            image_info=image_info,
        )

        # ─── 4. Store the session ──────────────────────────────
        session_id = session.create({
            "title": display_title,
            "kind": kind,
            "source": source,
            "source_type": source_type,
            "duration": duration,
            "language": language,
            "transcript": transcript,
            "diarization": diarization,
            "image_info": image_info,
            "analysis": analysis,
        })

        return {
            "session_id": session_id,
            "title": display_title,
            "kind": kind,
            "source_type": source_type,
            "duration": duration,
            "language": language,
            "transcript": transcript,
            "diarization": diarization,
            "image_info": image_info,
            "analysis": analysis,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Processing failed: {exc}")
    finally:
        for p in cleanup:
            p.unlink(missing_ok=True)
        try:
            work_dir.rmdir()
        except OSError:
            pass