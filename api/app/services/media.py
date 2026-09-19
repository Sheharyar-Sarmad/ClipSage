# api/app/services/media.py
# File handling: detection, audio extraction, image description, downloads.

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".avi"}


# ─── Locate ffmpeg & yt-dlp ──────────────────────────────────
def _find_tool(name: str, extra_paths: list[str] | None = None) -> str:
    """
    Find an executable by name.
    Checks system PATH first, then any extra_paths.
    Falls back to imageio_ffmpeg for ffmpeg if installed.
    """
    # 1. System PATH
    on_path = shutil.which(name)
    if on_path:
        return on_path

    # 2. Common Windows install locations
    extra_paths = extra_paths or []
    home = Path.home()
    candidates = [
        Path(r"C:\tools") / f"{name}.exe",
        Path(r"C:\ffmpeg\bin") / f"{name}.exe",
        home / "tools" / f"{name}.exe",
        home / "scoop" / "shims" / f"{name}.exe",
        home / "AppData" / "Local" / "Microsoft" / "WinGet" / "Links" / f"{name}.exe",
        *[Path(p) / f"{name}.exe" for p in extra_paths],
    ]
    for c in candidates:
        if c.exists():
            return str(c)

    # 3. imageio-ffmpeg (Python fallback) — only for ffmpeg
    if name == "ffmpeg":
        try:
            import imageio_ffmpeg
            return imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            pass

    raise FileNotFoundError(
        f"Could not find '{name}'. Install it with one of:\n"
        f"  winget install Gyan.FFmpeg\n"
        f"  winget install yt-dlp.yt-dlp\n"
        f"or place the .exe in C:\\tools and restart the terminal."
    )


FFMPEG_BIN: str = _find_tool("ffmpeg")
YTDLP_BIN: str = _find_tool("yt-dlp")


def is_image(path: Path) -> bool:
    return path.suffix.lower() in IMAGE_EXTENSIONS


def is_audio(path: Path) -> bool:
    return path.suffix.lower() in AUDIO_EXTENSIONS


def is_video(path: Path) -> bool:
    return path.suffix.lower() in VIDEO_EXTENSIONS


def detect_kind(path: Path) -> str:
    if is_image(path):
        return "image"
    if is_audio(path):
        return "audio"
    if is_video(path):
        return "video"
    return "unknown"


def extract_audio(video_or_audio: Path) -> Path:
    """
    Extract mono 16kHz audio from any media file using ffmpeg.
    Uses FFMPEG_BIN resolved at module load.
    """
    out = Path(tempfile.mktemp(suffix=".mp3"))
    cmd = [
        FFMPEG_BIN, "-y", "-i", str(video_or_audio),
        "-ac", "1", "-ar", "16000", "-b:a", "64k",
        str(out),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return out


def describe_image(path: Path) -> dict:
    return {
        "filename": path.name,
        "transcript": f"[image] {path.name}",
        "duration": None,
    }


def download_from_url(url: str) -> tuple[Path, dict]:
    """
    Download audio using YTDLP_BIN resolved at module load.
    """
    out_dir = Path(tempfile.mkdtemp())
    out_template = str(out_dir / "%(id)s.%(ext)s")

    cmd = [
        YTDLP_BIN,
        "--ffmpeg-location", FFMPEG_BIN,
        "-f", "bestaudio/best",
        "-x", "--audio-format", "mp3",
        "--audio-quality", "64K",
        "-o", out_template,
        "--print-json",
        url,
    ]
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)

    meta = json.loads(result.stdout.strip().splitlines()[-1])

    audio_files = list(out_dir.glob("*.mp3"))
    if not audio_files:
        raise RuntimeError("yt-dlp did not produce an audio file")

    return audio_files[0], {
        "title": meta.get("title"),
        "duration": meta.get("duration"),
        "uploader": meta.get("uploader"),
    }