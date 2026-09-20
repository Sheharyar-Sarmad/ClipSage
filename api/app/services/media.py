"""
Media utilities for ClipSage.

Handles:
- Media type detection
- Audio extraction with FFmpeg
- Video frame extraction
- Image description through Groq Vision
- Remote media/audio downloading through yt-dlp
"""

import base64
import json
import logging
import os
import shutil
import subprocess
import tempfile
import traceback
from pathlib import Path
from typing import Optional

import imageio_ffmpeg
from groq import Groq

from app.config.settings import settings


logger = logging.getLogger(__name__)


IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".bmp",
}

AUDIO_EXTENSIONS = {
    ".mp3",
    ".wav",
    ".m4a",
    ".aac",
    ".flac",
    ".ogg",
}

VIDEO_EXTENSIONS = {
    ".mp4",
    ".mov",
    ".mkv",
    ".webm",
    ".avi",
}

VISION_MODEL_FALLBACKS = [
    "qwen/qwen3.8-27b",
    "qwen/qwen3.6-27b",
    "llama-3.2-11b-vision-instruct",
    "llama-3.2-90b-vision-instruct",
]


def _create_groq_client() -> Optional[Groq]:
    """Create the Groq client without crashing application startup."""
    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
        logger.info("Groq client initialized successfully.")
        return client
    except Exception as exc:
        logger.exception("Failed to initialize Groq client: %s", exc)
        return None


groq_client = _create_groq_client()


def _find_tool(
    name: str,
    extra_paths: Optional[list[str]] = None,
) -> str:
    """
    Find an executable on PATH or in common Windows locations.

    FFmpeg also falls back to the executable bundled with imageio-ffmpeg.
    """
    executable = shutil.which(name)
    if executable:
        return executable

    if name == "ffmpeg":
        try:
            executable = imageio_ffmpeg.get_ffmpeg_exe()

            if executable and os.path.exists(executable):
                if os.name != "nt":
                    current_mode = os.stat(executable).st_mode
                    os.chmod(executable, current_mode | 0o111)

                return executable

        except Exception as exc:
            logger.warning(
                "Could not locate FFmpeg through imageio-ffmpeg: %s",
                exc,
            )

    extra_paths = extra_paths or []
    home = Path.home()

    candidates = [
        Path(r"C:\tools") / f"{name}.exe",
        Path(r"C:\ffmpeg\bin") / f"{name}.exe",
        home / "tools" / f"{name}.exe",
        home / "scoop" / "shims" / f"{name}.exe",
        (
            home
            / "AppData"
            / "Local"
            / "Microsoft"
            / "WinGet"
            / "Links"
            / f"{name}.exe"
        ),
        *[Path(path) / f"{name}.exe" for path in extra_paths],
    ]

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    raise FileNotFoundError(
        f"Executable '{name}' could not be found."
    )


def _resolve_tools() -> tuple[str, str]:
    """Resolve FFmpeg and yt-dlp paths."""
    try:
        ffmpeg = _find_tool("ffmpeg")
    except FileNotFoundError:
        ffmpeg = "ffmpeg"
        logger.warning(
            "FFmpeg was not found during startup. "
            "It will be resolved again when needed."
        )

    try:
        ytdlp = _find_tool("yt-dlp")
    except FileNotFoundError:
        ytdlp = "yt-dlp"
        logger.warning(
            "yt-dlp was not found during startup. "
            "It will be resolved again when needed."
        )

    return ffmpeg, ytdlp


FFMPEG_BIN, YTDLP_BIN = _resolve_tools()


def is_image(path: Path) -> bool:
    """Return True when the path points to a supported image."""
    return path.suffix.lower() in IMAGE_EXTENSIONS


def is_audio(path: Path) -> bool:
    """Return True when the path points to a supported audio file."""
    return path.suffix.lower() in AUDIO_EXTENSIONS


def is_video(path: Path) -> bool:
    """Return True when the path points to a supported video."""
    return path.suffix.lower() in VIDEO_EXTENSIONS


def detect_kind(path: Path) -> str:
    """Detect whether a file is an image, audio, video, or unknown."""
    if is_image(path):
        kind = "image"
    elif is_audio(path):
        kind = "audio"
    elif is_video(path):
        kind = "video"
    else:
        kind = "unknown"

    logger.debug(
        "Detected media type '%s' for file '%s'.",
        kind,
        path.name,
    )

    return kind


def extract_audio(video_or_audio: Path) -> Optional[Path]:
    """
    Extract a mono 16 kHz WAV audio track from a media file.

    Returns None when the input does not exist or contains no audio.
    """
    logger.debug("Extracting audio from: %s", video_or_audio)

    if not video_or_audio.exists():
        logger.warning("Media file does not exist: %s", video_or_audio)
        return None

    ffmpeg_bin = _find_tool("ffmpeg")

    output_path = (
        Path(tempfile.gettempdir())
        / f"extracted_{os.urandom(8).hex()}.wav"
    )

    command = [
        ffmpeg_bin,
        "-y",
        "-i",
        str(video_or_audio),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        str(output_path),
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        stderr = result.stderr or ""

        no_audio_markers = (
            "Output file is empty",
            "does not contain any stream",
            "no audio",
            "invalid argument",
        )

        if any(marker.lower() in stderr.lower() for marker in no_audio_markers):
            logger.info(
                "No audio track found in %s. Continuing with visual processing.",
                video_or_audio.name,
            )
        else:
            logger.error(
                "FFmpeg audio extraction failed: %s",
                stderr[-1000:],
            )

        return None

    if not output_path.exists() or output_path.stat().st_size == 0:
        logger.warning("FFmpeg produced an empty audio file.")
        return None

    logger.info(
        "Audio extracted successfully: %s bytes.",
        output_path.stat().st_size,
    )

    return output_path


def extract_video_frame(video_path: Path) -> Optional[Path]:
    """Extract the first frame of a video as a JPEG image."""
    try:
        logger.debug("Extracting first frame from: %s", video_path)

        if not video_path.exists():
            logger.warning("Video file does not exist: %s", video_path)
            return None

        ffmpeg_bin = _find_tool("ffmpeg")

        frame_path = (
            Path(tempfile.gettempdir())
            / f"frame_{os.urandom(8).hex()}.jpg"
        )

        command = [
            ffmpeg_bin,
            "-y",
            "-ss",
            "00:00:00",
            "-i",
            str(video_path),
            "-vframes",
            "1",
            "-q:v",
            "2",
            str(frame_path),
        ]

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False,
        )

        if (
            result.returncode == 0
            and frame_path.exists()
            and frame_path.stat().st_size > 0
        ):
            logger.info("Video frame extracted: %s", frame_path)
            return frame_path

        logger.error(
            "Video frame extraction failed: %s",
            (result.stderr or "Unknown FFmpeg error")[-1000:],
        )

    except Exception:
        logger.exception("Unexpected error during video frame extraction.")

    return None


def _build_image_data_url(path: Path) -> str:
    """Read an image and convert it into a base64 data URL."""
    with path.open("rb") as image_file:
        encoded = base64.b64encode(image_file.read()).decode("utf-8")

    extension = path.suffix.lower()

    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
    }

    mime_type = mime_types.get(extension, "application/octet-stream")

    return f"data:{mime_type};base64,{encoded}"


def describe_image(path: Path) -> dict:
    """
    Generate a detailed description of an image using Groq Vision.

    Returns a dictionary containing filename, transcript, and duration.
    """
    logger.debug("Running visual analysis on: %s", path)

    if not path.exists():
        return {
            "filename": path.name,
            "transcript": "[Error]: Image file does not exist.",
            "duration": None,
        }

    if groq_client is None:
        return {
            "filename": path.name,
            "transcript": "[Error]: Groq client is unavailable.",
            "duration": None,
        }

    try:
        data_url = _build_image_data_url(path)
    except Exception as exc:
        logger.exception("Failed to read image: %s", path)

        return {
            "filename": path.name,
            "transcript": f"[Error reading file]: {exc}",
            "duration": None,
        }

    prompt = (
        "Describe this image in meticulous detail. Highlight the main "
        "visual theme, color schemes, graphics, 3D layouts, backgrounds, "
        "design motifs, and any visible written text elements clearly."
    )

    last_error = "No vision model was processed."

    for model_name in VISION_MODEL_FALLBACKS:
        try:
            response = groq_client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt,
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": data_url,
                                },
                            },
                        ],
                    }
                ],
                temperature=0.2,
            )

            vision_description = response.choices[0].message.content

            if not vision_description:
                raise RuntimeError(
                    "Vision model returned an empty response."
                )

            logger.info(
                "Vision processing succeeded using model: %s",
                model_name,
            )

            return {
                "filename": path.name,
                "transcript": (
                    "[Visual AI Scene Analysis]: "
                    f"{vision_description}"
                ),
                "duration": None,
            }

        except Exception as exc:
            last_error = str(exc)
            logger.warning(
                "Vision model '%s' failed: %s",
                model_name,
                last_error,
            )

    diagnostic_report = {
        "error_summary": (
            "All configured Groq Vision fallback models failed."
        ),
        "last_upstream_api_exception": last_error,
        "active_models_attempted": VISION_MODEL_FALLBACKS,
        "system_stack_trace": traceback.format_exc()[-1000:],
    }

    return {
        "filename": path.name,
        "transcript": (
            "[Vision Analysis Failed]: "
            "All configured vision models failed. "
            f"Debug context:\n{json.dumps(diagnostic_report, indent=2)}"
        ),
        "duration": None,
    }

def download_from_url(url: str) -> tuple[Path, dict]:
    """
    Downloads remote media using yt-dlp with extensive subprocess telemetry outputs.
    Adaptive format handling allows seamless extraction of both YouTube Shorts and standard videos.
    """
    print(f"[DEBUG LOGGER] Initiating cloud retrieval sequence tracking for URL endpoint: {url}")
    ffmpeg_bin = _find_tool("ffmpeg")
    ytdlp_bin = _find_tool("yt-dlp")
    
    out_dir = Path(tempfile.mkdtemp())
    out_template = str(out_dir / "%(id)s.%(ext)s")
    
    current_env = os.environ.copy()
    if os.name != 'nt':
        current_env["PATH"] = f"/usr/bin:{current_env.get('PATH', '')}"

    # FIXED: Updated the format flag (-f) to grab standalone audio OR extract audio from the combined video file gracefully
    cmd = [
        ytdlp_bin, 
        "--ffmpeg-location", ffmpeg_bin,
        "--js-runtimes", "node",
        "--remote-components", "ejs:github",
        "--extractor-args", "youtube:client=android",
        "--no-check-certificates",
        "-f", "ba/ba*+extractaudio/b/best",            # Adaptive format ladder: grabs audio track or falls back to best stream
        "-x", "--audio-format", "wav",                 # Instructs FFmpeg to convert whatever it downloads into a raw WAV
        "-o", out_template, 
        "--print-json", 
        url
    ]
    
    print(f"[DEBUG LOGGER] Dispatching extractor thread matrix system command: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, env=current_env)
    print(f"[DEBUG LOGGER] Extraction shell runtime finished with status response: {result.returncode}")

    if result.returncode != 0:
        diagnostic_report = {
            "return_code": result.returncode,
            "stdout_stream": result.stdout[-500:] if result.stdout else "None",
            "stderr_stream": result.stderr[-1000:] if result.stderr else "None",
            "targeted_extraction_url": url,
            "workspace_directory": str(out_dir)
        }
        serialized_dump = json.dumps(diagnostic_report, indent=2)
        print(f"[CRITICAL DOWNLOAD ERROR] yt-dlp process pipeline dropped:\n{serialized_dump}")
        raise RuntimeError(f"Media download extraction phase crashed:\n{serialized_dump}")

    try:
        # Safely split logs to parse JSON metadata
        lines = [line for line in result.stdout.strip().splitlines() if line.strip()]
        meta = json.loads(lines[-1])
        print(f"[DEBUG LOGGER] Meta descriptors parsed successfully. Title matched: '{meta.get('title')}'")
    except Exception as json_err:
        print(f"[CRITICAL JSON ERROR] Failed parsing yt-dlp metadata: {str(json_err)}")
        meta = {"title": "Extracted Media Stream Title Unavailable", "duration": None, "uploader": "Unknown"}

    audio_files = list(out_dir.glob("*.wav"))
    if not audio_files:
        raise RuntimeError(f"FILE PIPELINE ERROR: No valid audio wav artifacts were generated inside: {out_dir}")

    return audio_files[0], {
        "title": meta.get("title") or "Untitled Link Asset",
        "duration": meta.get("duration"),
        "uploader": meta.get("uploader") or "Unknown Provider",
    }
