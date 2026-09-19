# api/app/services/media.py
# File handling: detection, audio extraction, image description, downloads.

import os
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
import imageio_ffmpeg

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".avi"}

# ─── Locate ffmpeg & yt-dlp ──────────────────────────────────
def _find_tool(name: str, extra_paths: list[str] | None = None) -> str:
    """
    Find an executable by name.
    Prioritizes python packages first to prevent cloud runtime path blocks.
    Automatically handles Linux permission settings for embedded binaries.
    """
    # 1. Force python bundle fallback first for ffmpeg
    if name == "ffmpeg":
        try:
            exe_path = imageio_ffmpeg.get_ffmpeg_exe()
            
            # Grant execute permission (+x) if running on a Linux cloud container
            if os.name != 'nt' and exe_path and os.path.exists(exe_path):
                current_mode = os.stat(exe_path).st_mode
                os.chmod(exe_path, current_mode | 0o111)
                
            return exe_path
        except Exception:
            pass

    # 2. Try python environment bundle path for yt-dlp
    on_path = shutil.which(name)
    if on_path:
        return on_path

    # 3. Common Windows install locations
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
    
    # Run and capture exact internal system error details if it breaks
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        error_msg = result.stderr or result.stdout or f"Exit status {result.returncode}"
        raise RuntimeError(f"FFmpeg conversion error: {error_msg}")
        
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
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        error_msg = result.stderr or result.stdout or f"Exit status {result.returncode}"
        raise RuntimeError(f"yt-dlp download error: {error_msg}")

    meta = json.loads(result.stdout.strip().splitlines()[-1])

    audio_files = list(out_dir.glob("*.mp3"))
    if not audio_files:
        raise RuntimeError("yt-dlp did not produce an audio file")

    return audio_files[0], {
        "title": meta.get("title"),
        "duration": meta.get("duration"),
        "uploader": meta.get("uploader"),
    }
