"""
api/app/services/media.py

Media utilities for ClipSage.

Handles:
- Media type detection
- Audio extraction with FFmpeg
- Video frame extraction
- Image description through Groq Vision
- Remote media/audio downloading through yt-dlp

Designed for cross-platform media processing, including
YouTube, Shorts, Instagram, Facebook, and similar URLs.
"""

import base64
import json
import logging
import os
import shutil
import subprocess
import tempfile
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
    """Find an executable on PATH or in common Windows locations."""
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
    """Resolve FFmpeg and yt-dlp paths safely at module initialization."""
    try:
        ffmpeg = _find_tool("ffmpeg")
    except FileNotFoundError:
        ffmpeg = "ffmpeg"
        logger.warning(
            "FFmpeg was not found during startup. "
            "It will be resolved on demand."
        )

    try:
        ytdlp = _find_tool("yt-dlp")
    except FileNotFoundError:
        ytdlp = "yt-dlp"
        logger.warning(
            "yt-dlp was not found during startup. "
            "It will be resolved on demand."
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
    """Return True when the path points to a supported video file."""
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
    Extract a mono 16 kHz WAV audio track safely.

    Returns None when the file does not exist or has no usable audio track.
    """
    logger.debug("Extracting audio from: %s", video_or_audio)

    if not video_or_audio.exists():
        logger.warning(
            "Media file does not exist: %s",
            video_or_audio,
        )
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
            "output file is empty",
            "does not contain any stream",
            "no audio",
            "invalid argument",
        )

        if any(
            marker in stderr.lower()
            for marker in no_audio_markers
        ):
            logger.info(
                "No audio track discovered in %s.",
                video_or_audio.name,
            )
        else:
            logger.error(
                "FFmpeg audio extraction failed: %s",
                stderr[-1000:],
            )

        return None

    if (
        not output_path.exists()
        or output_path.stat().st_size == 0
    ):
        logger.warning(
            "FFmpeg produced an empty WAV asset."
        )
        return None

    logger.info(
        "Audio extracted successfully: %s",
        output_path,
    )

    return output_path


def extract_video_frame(video_path: Path) -> Optional[Path]:
    """Extract the first frame of a video as a JPEG image."""
    try:
        logger.debug(
            "Extracting first frame from: %s",
            video_path,
        )

        if not video_path.exists():
            logger.warning(
                "Video file does not exist: %s",
                video_path,
            )
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
            logger.info(
                "Video frame extracted: %s",
                frame_path,
            )
            return frame_path

        logger.error(
            "Video frame extraction failed: %s",
            (result.stderr or "Unknown FFmpeg error")[-1000:],
        )

    except Exception:
        logger.exception(
            "Unexpected error during video frame extraction."
        )

    return None


def _build_image_data_url(path: Path) -> str:
    """Read an image and convert it into a base64 data URL."""
    with path.open("rb") as image_file:
        encoded = base64.b64encode(
            image_file.read()
        ).decode("utf-8")

    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
    }

    mime_type = mime_types.get(
        path.suffix.lower(),
        "image/jpeg",
    )

    return f"data:{mime_type};base64,{encoded}"


def describe_image(path: Path) -> dict:
    """
    Analyze an image using Groq Vision with fallback models.

    Returns:
        Dictionary containing filename, transcript, and duration.
    """
    logger.info(
        "Running multi-modal analysis on: %s",
        path,
    )

    if groq_client is None:
        return {
            "filename": path.name,
            "transcript": (
                "[Error]: Groq client is unavailable."
            ),
            "duration": None,
        }

    try:
        data_url = _build_image_data_url(path)
    except Exception as exc:
        logger.exception(
            "Failed to read visual data from: %s",
            path,
        )

        return {
            "filename": path.name,
            "transcript": (
                f"[Error reading visual data]: {exc}"
            ),
            "duration": None,
        }

    prompt = (
        "Describe this layout in meticulous detail. "
        "Highlight the main visual theme, color schemes, "
        "graphics, design motifs, and any visible written "
        "text elements clearly."
    )

    last_captured_error = "No vision engine was processed."

    for model_name in VISION_MODEL_FALLBACKS:
        try:
            response = groq_client.chat.completions.create(
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
                model=model_name,
                temperature=0.2,
            )

            vision_description = (
                response.choices[0].message.content
            )

            if not vision_description:
                raise RuntimeError(
                    "Vision model returned an empty response."
                )

            logger.info(
                "Vision analysis completed using model: %s",
                model_name,
            )

            return {
                "filename": path.name,
                "transcript": (
                    "[Visual AI Scene Analysis via "
                    f"{model_name}]: {vision_description}"
                ),
                "duration": None,
            }

        except Exception as exc:
            last_captured_error = str(exc)

            logger.warning(
                "Vision model '%s' failed: %s",
                model_name,
                last_captured_error,
            )

    return {
        "filename": path.name,
        "transcript": (
            "[Vision Circuit Fault]: All fallbacks "
            "exhausted. Debug info: "
            f"{last_captured_error}"
        ),
        "duration": None,
    }


def download_from_url(url: str) -> tuple[Path, dict]:
    """
    Download remote media as WAV audio through yt-dlp.

    The command uses:
    - FFmpeg for audio extraction
    - Node.js EJS runtime
    - EJS remote components
    - YouTube Android client
    - IPv4 forcing
    - Adaptive best-audio format selection

    Returns:
        A tuple containing the WAV path and metadata dictionary.
    """
    if not url.strip():
        raise ValueError("URL cannot be empty.")

    logger.info(
        "Initiating dynamic link download: %s",
        url,
    )

    ffmpeg_bin = _find_tool("ffmpeg")
    ytdlp_bin = _find_tool("yt-dlp")

    output_dir = Path(tempfile.mkdtemp(prefix="clipsage_"))
    output_template = str(
        output_dir / "%(id)s.%(ext)s"
    )

    current_env = os.environ.copy()

    if os.name != "nt":
        current_env["PATH"] = (
            f"/usr/bin:{current_env.get('PATH', '')}"
        )

    command = [
        ytdlp_bin,
        "--ffmpeg-location",
        ffmpeg_bin,
        "--js-runtimes",
        "node",
        "--remote-components",
        "ejs:github",
        "--extractor-args",
        "youtube:client=android",
        "--no-check-certificates",
        "--force-ipv4",
        "-f",
        "ba/ba*+extractaudio/b/best",
        "-x",
        "--audio-format",
        "wav",
        "-o",
        output_template,
        "--print-json",
        url,
    ]

    logger.debug(
        "Executing yt-dlp: %s",
        " ".join(command),
    )

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        env=current_env,
        check=False,
    )

    if result.returncode != 0:
        diagnostic_report = {
            "return_code": result.returncode,
            "stdout_stream": (
                result.stdout[-500:]
                if result.stdout
                else "None"
            ),
            "stderr_stream": (
                result.stderr[-1000:]
                if result.stderr
                else "None"
            ),
            "targeted_extraction_url": url,
            "workspace_directory": str(output_dir),
        }

        serialized_report = json.dumps(
            diagnostic_report,
            indent=2,
        )

        logger.error(
            "Media extraction failed:\n%s",
            serialized_report,
        )

        raise RuntimeError(
            "Platform media extraction crashed:\n"
            f"{serialized_report}"
        )

    metadata = {
        "title": "Extracted Cloud Media Asset",
        "duration": None,
        "uploader": "Unknown Content Provider",
    }

    try:
        lines = [
            line.strip()
            for line in result.stdout.splitlines()
            if line.strip()
        ]

        if not lines:
            raise ValueError(
                "yt-dlp returned no metadata output."
            )

        metadata = json.loads(lines[-1])

        logger.info(
            "Media metadata retrieved. Title: '%s'",
            metadata.get("title"),
        )

    except (json.JSONDecodeError, ValueError, IndexError) as exc:
        logger.warning(
            "Failed to parse yt-dlp metadata: %s",
            exc,
        )

    audio_files = list(output_dir.glob("*.wav"))

    if not audio_files:
        raise RuntimeError(
            "Extraction completed but no WAV files were "
            f"found inside: {output_dir}"
        )

    return audio_files[0], {
        "title": (
            metadata.get("title")
            or "Untitled Universal URL Link Asset"
        ),
        "duration": metadata.get("duration"),
        "uploader": (
            metadata.get("uploader")
            or "Unknown Content Provider"
        ),
    }
