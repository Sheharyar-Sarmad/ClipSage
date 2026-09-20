# api/app/routes/process.py
# Ingest media (file or URL) → multi-modal track parsing → analyze → create session.

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
            source_type = "youtube" if ("youtube.com" in url or "youtu.be" in url) else "url"
            kind = media.detect_kind(raw_path)

        # ─── Multi-Modal Orchestration Pipeline ───
        transcript = None
        language = None
        duration = None
        image_info = None
        diarization = []

        if kind == "image":
            # Just extract visual context for static photos
            image_info = media.describe_image(raw_path)
        else:
            # 1. Attempt to capture Audio Tracks
            audio_path = media.extract_audio(raw_path)
            if audio_path:
                cleanup.append(audio_path)
                try:
                    tr = transcription.transcribe(audio_path)
                    transcript = tr["transcript"]
                    language = tr.get("language")
                    duration = tr.get("duration")
                except Exception as whisper_err:
                    print(f"[WARNING LOGGER] Whisper extraction skipped: {str(whisper_err)}")
                    transcript = None
            else:
                # Video has no audio track - remains None quietly
                transcript = None

            # 2. Extract Visual Context if it's a Video file container
            if kind == "video":
                video_frame_path = media.extract_video_frame(raw_path)
                if video_frame_path:
                    cleanup.append(video_frame_path)
                    image_info = media.describe_image(video_frame_path)

        # 3. Compile Unified Data Feed to the Summary Engine
        analysis = summarization.analyze(
            title=display_title,
            kind=kind,
            source_type=source_type,
            transcript=transcript,
            diarization=diarization,
            image_info=image_info,
        )

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

    except Exception as exc:
        raise HTTPException(500, f"Processing failed: {exc}")
    finally:
        for p in cleanup: p.unlink(missing_ok=True)
        try: work_dir.rmdir()
        except OSError: pass
