# api/app/routes/process.py
# Ingest media (file or URL) -> multi-modal track parsing -> analyze -> create session.

import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.routes import make_router
from app.services import media, session, summarization, transcription

logger = logging.getLogger(__name__)

router = make_router("process")


@router.post("")
async def process(
    file: UploadFile | None = File(None),
    url: str | None = Form(None),
    title: str | None = Form(None),
):
    if not file and not url:
        raise HTTPException(400, "Provide either 'file' (upload) or 'url' (link).")
    if file and url:
        raise HTTPException(400, "Provide 'file' or 'url', not both.")

    work_dir = Path(tempfile.mkdtemp())
    cleanup: list[Path] = []

    try:
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

        # ─── Multi-Modal Orchestration Pipeline ───
        transcript: str | None = None
        transcript_error: str | None = None
        language = None
        duration = None
        image_info = None
        diarization: list[dict] = []

        if kind == "image":
            # Static photo: visual description only
            image_info = media.describe_image(raw_path)
        else:
            # 1. Audio track -> transcript
            audio_path = media.extract_audio(raw_path)
            if audio_path:
                cleanup.append(audio_path)
                try:
                    tr = transcription.transcribe(audio_path)
                    transcript = (tr.get("transcript") or "").strip() or None
                    language = tr.get("language")
                    duration = tr.get("duration")
                    if not transcript:
                        transcript_error = "Transcription returned no speech."
                        logger.info("Whisper returned an empty transcript.")
                except Exception as exc:
                    logger.exception("Transcription failed")
                    transcript_error = f"Transcription failed: {exc}"
            else:
                transcript_error = "No audio track found or audio extraction failed."
                logger.info(transcript_error)

            # 2. Visual context for video containers
            if kind == "video":
                video_frame_path = media.extract_video_frame(raw_path)
                if video_frame_path:
                    cleanup.append(video_frame_path)
                    image_info = media.describe_image(video_frame_path)

        # 3. Unified feed to the summary engine
        analysis = summarization.analyze(
            title=display_title,
            kind=kind,
            source_type=source_type,
            transcript=transcript,
            diarization=diarization,
            image_info=image_info,
            transcript_error=transcript_error,
        )

        session_id = session.create(
            {
                "title": display_title,
                "kind": kind,
                "source": source,
                "source_type": source_type,
                "duration": duration,
                "language": language,
                "transcript": transcript,
                "transcript_error": transcript_error,
                "diarization": diarization,
                "image_info": image_info,
                "analysis": analysis,
            }
        )

        return {
            "session_id": session_id,
            "title": display_title,
            "kind": kind,
            "source_type": source_type,
            "duration": duration,
            "language": language,
            "transcript": transcript,
            "transcript_error": transcript_error,
            "diarization": diarization,
            "image_info": image_info,
            "analysis": analysis,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Processing failed")
        raise HTTPException(500, f"Processing failed: {exc}")
    finally:
        for p in cleanup:
            p.unlink(missing_ok=True)
        try:
            work_dir.rmdir()
        except OSError:
            pass