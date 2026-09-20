# api/app/services/media.py
# File handling: detection, audio extraction, image description, downloads.

import os
import json
import base64
import shutil
import subprocess
import tempfile
from pathlib import Path
import imageio_ffmpeg
from groq import Groq
from app.config.settings import settings

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".avi"}

# Initialize a standard Groq SDK client for multi-modal imaging tasks
_groq_client = Groq(api_key=settings.GROQ_API_KEY)

# ─── Locate ffmpeg & yt-dlp ──────────────────────────────────
def _find_tool(name: str, extra_paths: list[str] | None = None) -> str:
    """
    Find an executable by name.
    Prioritizes system PATH first (crucial for Render native apt package tool),
    then checks local directories, falling back to imageio-ffmpeg as a last resort.
    """
    # 1. System PATH - PRIORITIZED FIRST FOR PRODUCTION
    on_path = shutil.which(name)
    if on_path:
        return on_path

    # 2. imageio-ffmpeg (Python fallback) — only if not found on system PATH
    if name == "ffmpeg":
        try:
            exe_path = imageio_ffmpeg.get_ffmpeg_exe()
            if os.name != 'nt' and exe_path and os.path.exists(exe_path):
                current_mode = os.stat(exe_path).st_mode
                os.chmod(exe_path, current_mode | 0o111)
            return exe_path
        except Exception:
            pass

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
    Finds the tool path dynamically to prevent cloud path locks.
    """
    ffmpeg_bin = _find_tool("ffmpeg")
    
    # BULLETPROOF FIX: Generate a fresh string path inside the temp folder 
    # to prevent write-lock/overwrite crashes from pre-created 0-byte items
    unique_id = os.urandom(8).hex()
    out = Path(tempfile.gettempdir()) / f"extracted_{unique_id}.mp3"
        
    cmd = [
        ffmpeg_bin, "-y", "-i", str(video_or_audio),
        "-ac", "1", "-ar", "16000", "-b:a", "64k",
        str(out),
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Validate actual execution status code from the operating system
    if result.returncode != 0:
        error_msg = result.stderr or result.stdout or f"Exit status {result.returncode}"
        if "Copyright" in error_msg and "\n" in error_msg:
            lines = error_msg.splitlines()
            clean_lines = [l for l in lines if not l.startswith("  ") and "built with" not in l]
            error_msg = " | ".join(clean_lines[-3:])
        raise RuntimeError(f"FFmpeg conversion error: {error_msg}")
        
    return out


def describe_image(path: Path) -> dict:
    """
    Leverages Groq's multi-modal Llama-Vision model to read and 
    describe the visual contents of uploaded static images.
    """
    try:
        # Read and transform raw binary data into base64 strings
        with open(path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
        
        # Parse image mime types dynamically
        mime_type = "image/jpeg" if path.suffix.lower() in [".jpg", ".jpeg"] else f"image/{path.suffix.lower()[1:]}"
        data_url = f"data:{mime_type};base64,{encoded_string}"

        # Invoke Groq's vision processing engine
        chat_completion = _groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this image in detail. Highlight any visible text, logos, layout structures, colors, patterns, or contextual graphics clearly."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": data_url,
                            },
                        },
                    ],
                }
            ],
            model="llama-3.2-11b-vision-preview",
            temperature=0.2,
        )

        vision_description = chat_completion.choices.message.content
        return {
            "filename": path.name,
            "transcript": f"[Visual AI Description]: {vision_description}",
            "duration": None,
        }
        
    except Exception as exc:
        # Graceful fallback descriptor to prevent server error loopings
        return {
            "filename": path.name,
            "transcript": f"[Visual Content Bypass]: An asset titled '{path.stem}' was uploaded.",
            "duration": None,
        }


def download_from_url(url: str) -> tuple[Path, dict]:
    """
    Download audio using yt-dlp resolved dynamically.
    """
    ffmpeg_bin = _find_tool("ffmpeg")
    ytdlp_bin = _find_tool("yt-dlp")
    
    out_dir = Path(tempfile.mkdtemp())
    out_template = str(out_dir / "%(id)s.%(ext)s")

    cmd = [
        ytdlp_bin,
        "--ffmpeg-location", ffmpeg_bin,
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
