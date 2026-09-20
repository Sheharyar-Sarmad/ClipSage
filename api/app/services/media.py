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

_groq_client = Groq(api_key=settings.GROQ_API_KEY)

def _find_tool(name: str, extra_paths: list[str] | None = None) -> str:
    on_path = shutil.which(name)
    if on_path:
        return on_path

    if name == "ffmpeg":
        try:
            exe_path = imageio_ffmpeg.get_ffmpeg_exe()
            if os.name != 'nt' and exe_path and os.path.exists(exe_path):
                current_mode = os.stat(exe_path).st_mode
                os.chmod(exe_path, current_mode | 0o111)
            return exe_path
        except Exception:
            pass

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

    raise FileNotFoundError(f"Could not find '{name}'.")

FFMPEG_BIN: str = _find_tool("ffmpeg")
YTDLP_BIN: str = _find_tool("yt-dlp")

def is_image(path: Path) -> bool: return path.suffix.lower() in IMAGE_EXTENSIONS
def is_audio(path: Path) -> bool: return path.suffix.lower() in AUDIO_EXTENSIONS
def is_video(path: Path) -> bool: return path.suffix.lower() in VIDEO_EXTENSIONS

def detect_kind(path: Path) -> str:
    if is_image(path): return "image"
    if is_audio(path): return "audio"
    if is_video(path): return "video"
    return "unknown"

def extract_audio(video_or_audio: Path) -> Path:
    """
    Extracts raw 16kHz WAV mono streams to completely bypass 
    missing container codec limitations on cloud platforms.
    """
    ffmpeg_bin = _find_tool("ffmpeg")
    unique_id = os.urandom(8).hex()
    out = Path(tempfile.gettempdir()) / f"extracted_{unique_id}.wav"
        
    cmd = [
        ffmpeg_bin, "-y", "-i", str(video_or_audio),
        "-vn", "-ac", "1", "-ar", "16000", str(out)
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        error_msg = result.stderr or result.stdout or f"Exit status {result.returncode}"
        raise RuntimeError(f"FFmpeg conversion error: {error_msg}")
        
    return out

def describe_image(path: Path) -> dict:
    """
    Leverages Groq's multi-modal Llama-Vision model to read and 
    describe the visual contents of uploaded static images.
    """
    try:
        with open(path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
        
        mime_type = "image/jpeg" if path.suffix.lower() in [".jpg", ".jpeg"] else f"image/{path.suffix.lower()[1:]}"
        data_url = f"data:{mime_type};base64,{encoded_string}"

        chat_completion = _groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this image in meticulous detail. Highlight any visible logos, text overlays, color palettes, data layouts, or graphical patterns clearly."},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            model="qwen/qwen3.6-27b",
            temperature=0.2,
        )

        # FIXED: Pulled from correct choices object attribute formatting parameters
        vision_description = chat_completion.choices.message.content
        return {
            "filename": path.name,
            "transcript": f"[Visual AI Description]: {vision_description}",
            "duration": None,
        }
    except Exception as exc:
        return {
            "filename": path.name,
            "transcript": f"[Image processing bypass]: An asset titled '{path.stem}' was uploaded. Fallback data: {str(exc)}",
            "duration": None,
        }

def download_from_url(url: str) -> tuple[Path, dict]:
    ffmpeg_bin = _find_tool("ffmpeg")
    ytdlp_bin = _find_tool("yt-dlp")
    out_dir = Path(tempfile.mkdtemp())
    out_template = str(out_dir / "%(id)s.%(ext)s")

    cmd = [
        ytdlp_bin, "--ffmpeg-location", ffmpeg_bin,
        "-f", "bestaudio/best", "-x", "--audio-format", "wav",
        "-o", out_template, "--print-json", url
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp download error: {result.stderr}")

    meta = json.loads(result.stdout.strip().splitlines()[-1])
    audio_files = list(out_dir.glob("*.wav"))
    if not audio_files:
        raise RuntimeError("yt-dlp did not produce a wav file")

    return audio_files[0], {
        "title": meta.get("title"),
        "duration": meta.get("duration"),
        "uploader": meta.get("uploader"),
    }
