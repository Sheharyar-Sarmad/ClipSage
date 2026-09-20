# api/app/services/media.py
# File handling: detection, audio extraction, image description, downloads.
# Enhanced for multi-modal processing (Audio + Visuals) with quiet fallbacks.

import os
import json
import base64
import shutil
import sys
import traceback
import subprocess
import tempfile
from pathlib import Path
import imageio_ffmpeg
from groq import Groq
from app.config.settings import settings

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".avi"}

# FIXED: Expanded with multiple robust fallback vision models from your catalog list
VISION_MODEL_FALLBACKS = [
    "qwen/qwen3.8-27b",
    "qwen/qwen3.6-27b",
    "llama-3.2-11b-vision-instruct",
    "llama-3.2-90b-vision-instruct"
]

try:
    _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    print("[DEBUG LOGGER] Groq SDK instance initialized successfully.")
except Exception as e:
    print(f"[CRITICAL DEBUG LOGGER] Groq client initialization crash: {str(e)}")
    _groq_client = None


def _find_tool(name: str, extra_paths: list[str] | None = None) -> str:
    on_path = shutil.which(name)
    if on_path:
        return on_path

    if name == "ffmpeg":
        try:
            exe_path = imageio_ffmpeg.get_ffmpeg_exe()
            if exe_path and os.path.exists(exe_path):
                if os.name != 'nt':
                    current_mode = os.stat(exe_path).st_mode
                    os.chmod(exe_path, current_mode | 0o111)
                return exe_path
        except Exception as tool_exc:
            print(f"[WARNING LOGGER] Local imageio tracker evaluation bypassed: {str(tool_exc)}")

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

    raise FileNotFoundError(f"Binary execution tool '{name}' is missing completely.")


try:
    FFMPEG_BIN: str = _find_tool("ffmpeg")
    YTDLP_BIN: str = _find_tool("yt-dlp")
except Exception as init_err:
    print(f"[CRITICAL PATH ERROR] Initial tool location phase dropped: {str(init_err)}")
    FFMPEG_BIN = "ffmpeg"
    YTDLP_BIN = "yt-dlp"


def is_image(path: Path) -> bool: return path.suffix.lower() in IMAGE_EXTENSIONS
def is_audio(path: Path) -> bool: return path.suffix.lower() in AUDIO_EXTENSIONS
def is_video(path: Path) -> bool: return path.suffix.lower() in VIDEO_EXTENSIONS

def detect_kind(path: Path) -> str:
    kind = "unknown"
    if is_image(path): kind = "image"
    elif is_audio(path): kind = "audio"
    elif is_video(path): kind = "video"
    print(f"[DEBUG LOGGER] File format checklist: {path.name} verified as type -> '{kind}'")
    return kind


def extract_audio(video_or_audio: Path) -> Path | None:
    """
    Extracts audio to a WAV file. Returns None quietly if the file has 
    no audio track, completely preventing crash errors.
    """
    print(f"[DEBUG LOGGER] Starting audio stripping process for target: {video_or_audio}")
    if not video_or_audio.exists():
        return None

    ffmpeg_bin = _find_tool("ffmpeg")
    unique_id = os.urandom(8).hex()
    out = Path(tempfile.gettempdir()) / f"extracted_{unique_id}.wav"
        
    cmd = [
        ffmpeg_bin, "-y", "-i", str(video_or_audio),
        "-vn", "-ac", "1", "-ar", "16000", str(out)
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        stderr_str = result.stderr or ""
        if "Output file is empty" in stderr_str or "does not contain any stream" in stderr_str or "no audio" in stderr_str.lower() or "invalid argument" in stderr_str.lower():
            print("[DEBUG LOGGER] Video file does not contain an audio track. Proceeding silently via visuals only.")
            return None
        return None
        
    print(f"[DEBUG LOGGER] Audio track successfully extracted: {out.stat().st_size} bytes.")
    return out


def extract_video_frame(video_path: Path) -> Path | None:
    """
    Extracts a snapshot image frame from the absolute start of a video file 
    for visual AI analysis. Captures exact console errors if it drops out.
    """
    try:
        print(f"[DEBUG LOGGER] Pulling a visual frame snapshot from video file: {video_path}")
        ffmpeg_bin = _find_tool("ffmpeg")
        unique_id = os.urandom(8).hex()
        frame_out = Path(tempfile.gettempdir()) / f"frame_{unique_id}.jpg"

        cmd = [
            ffmpeg_bin, "-y", "-ss", "00:00:00", "-i", str(video_path),
            "-vframes", "1", "-q:v", "2", str(frame_out)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        print(f"[DEBUG LOGGER] Frame slice process exit code status: {result.returncode}")
        
        if result.returncode == 0 and frame_out.exists() and frame_out.stat().st_size > 0:
            print(f"[DEBUG LOGGER] Video frame successfully extracted at: {frame_out}")
            return frame_out
            
        print(f"[CRITICAL FRAME BLOCK] FFmpeg frame construction failed. Stderr logs: {result.stderr or 'Empty'}")
        return None
    except Exception as e:
        print(f"[WARNING LOGGER] Video frame extraction failed radically: {str(e)}")
        return None


def describe_image(path: Path) -> dict:
    """
    Leverages Groq Multi-Modal Vision models to describe the content of an image or video frame.
    """
    print(f"[DEBUG LOGGER] Running visual analysis on file: {path}")
    if not _groq_client:
        return {"filename": path.name, "transcript": "[Error]: Groq Client missing.", "duration": None}

    try:
        with open(path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
        mime_type = "image/jpeg" if path.suffix.lower() in [".jpg", ".jpeg"] else f"image/{path.suffix.lower()[1:]}"
        data_url = f"data:{mime_type};base64,{encoded_string}"
    except Exception as io_err:
        return {"filename": path.name, "transcript": f"[Error reading file]: {str(io_err)}", "duration": None}

    last_captured_error = "No engine processed yet"
    for model_candidate in VISION_MODEL_FALLBACKS:
        try:
            chat_completion = _groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text", 
                                "text": "Describe this layout in meticulous detail. Highlight the main visual theme, color schemes, graphics, 3D layouts, backgrounds, design motifs, and any visible written text elements clearly."
                            },
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    }
                ],
                model=model_candidate,
                temperature=0.2,
            )
            # Safe response parsing to fit official SDK return structures
            choices_data = chat_completion.choices
            if isinstance(choices_data, list) and len(choices_data) > 0:
                vision_description = choices_data[0].message.content
            else:
                vision_description = choices_data.message.content
                
            print(f"[DEBUG LOGGER] Vision processing successful using: {model_candidate}")
            return {
                "filename": path.name,
                "transcript": f"[Visual AI Scene Analysis]: {vision_description}",
                "duration": None,
            }
        except Exception as e:
            last_captured_error = str(e)
            print(f"[WARNING LOGGER] Model '{model_candidate}' failed: {last_captured_error}")
            continue

    exc_type, exc_obj, exc_tb = sys.exc_info()
    formatted_stack = traceback.format_exc()
    
    diagnostic_debug_report = {
        "error_summary": "All mapped Groq Vision processing engine fallback chains were completely exhausted.",
        "last_upstream_api_exception": last_captured_error,
        "active_models_attempted": VISION_MODEL_FALLBACKS,
        "failed_script_line_marker": exc_tb.tb_lineno if exc_tb else "Unknown",
        "system_stack_trace": formatted_stack[-1000:]
    }
    
    return {
        "filename": path.name,
        "transcript": f"[Extreme Error Vision Circuit Blocked]: Analysis failed. Granular Debug Context:\n{json.dumps(diagnostic_debug_report, indent=2)}",
        "duration": None,
    }


def download_from_url(url: str) -> tuple[Path, dict]:
    """
    Downloads remote media using yt-dlp with extensive subprocess telemetry outputs.
    """
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
        "title": meta.get("title") or "Untitled Link Asset",
        "duration": meta.get("duration"),
        "uploader": meta.get("uploader") or "Unknown Provider",
    }
