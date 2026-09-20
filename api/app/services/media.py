# api/app/services/media.py
# File handling: detection, audio extraction, image description, downloads.
# Enhanced with Extreme Multi-Layer Logging & Traceback Serialization.

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

# Fallback sequence catalog to keep vision functionality safe from model deprecations
VISION_MODEL_FALLBACKS = [
    "llama-3.2-11b-vision-preview",
    "llama-3.2-90b-vision-preview",
    "qwen/qwen3.6-27b",
    "qwen/qwen3.8-27b"
]

# Initialize a standard Groq SDK client safely
try:
    _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    print("[DEBUG LOGGER] Groq SDK instance initialized successfully.")
except Exception as e:
    print(f"[CRITICAL DEBUG LOGGER] Groq client initialization crash: {str(e)}")
    _groq_client = None


def _find_tool(name: str, extra_paths: list[str] | None = None) -> str:
    """
    Find an executable by name with structural trace routing logs.
    """
    print(f"[DEBUG LOGGER] Initiating search matrix for executable utility: '{name}'")
    
    # 1. System PATH Check
    on_path = shutil.which(name)
    if on_path:
        print(f"[DEBUG LOGGER] Found native tool '{name}' on global host path: {on_path}")
        return on_path

    # 2. Python imageio-ffmpeg specific context validation loop
    if name == "ffmpeg":
        try:
            print("[DEBUG LOGGER] Native path missed. Falling back to local python imageio bundle exploration...")
            exe_path = imageio_ffmpeg.get_ffmpeg_exe()
            if exe_path and os.path.exists(exe_path):
                if os.name != 'nt':
                    current_mode = os.stat(exe_path).st_mode
                    os.chmod(exe_path, current_mode | 0o111)
                    print(f"[DEBUG LOGGER] Linux execution bits (+x) successfully applied to: {exe_path}")
                return exe_path
        except Exception as tool_exc:
            print(f"[WARNING LOGGER] Local imageio tracker evaluation bypassed: {str(tool_exc)}")

    # 3. Windows local environments fallback paths array dictionary
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
            print(f"[DEBUG LOGGER] Windows secondary fallback tool resolved at: {c}")
            return str(c)

    raise FileNotFoundError(
        f"CRITICAL PATHING FAULT: Binary execution tool '{name}' is missing completely.\n"
        f"Verified Candidate Paths Searched: {[str(p) for p in candidates]}"
    )


# Module-level initializations wrapped safely to prevent crash locks on startup
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
    print(f"[DEBUG LOGGER] File format validation checklist: {path.name} verified as type -> '{kind}'")
    return kind


def extract_audio(video_or_audio: Path) -> Path:
    """
    Extracts raw 16kHz WAV mono streams with extreme logging for subprocess streams.
    """
    print(f"[DEBUG LOGGER] Starting audio stripping process for target: {video_or_audio}")
    if not video_or_audio.exists():
        raise FileNotFoundError(f"Extraction failed: source asset target does not exist at {video_or_audio}")

    ffmpeg_bin = _find_tool("ffmpeg")
    unique_id = os.urandom(8).hex()
    out = Path(tempfile.gettempdir()) / f"extracted_{unique_id}.wav"
    
    print(f"[DEBUG LOGGER] Generating dynamic destination file token: {out}")
        
    cmd = [
        ffmpeg_bin, "-y", "-i", str(video_or_audio),
        "-vn", "-ac", "1", "-ar", "16000", str(out)
    ]
    
    print(f"[DEBUG LOGGER] Invoking process subshell vector command matrix: {' '.join(cmd)}")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    print(f"[DEBUG LOGGER] Subprocess exit metadata returned code status: {result.returncode}")
    
    if result.returncode != 0:
        # Build out comprehensive troubleshooting log matrix
        error_context = {
            "exit_status": result.returncode,
            "stdout_logs": result.stdout[-500:] if result.stdout else "Empty",
            "stderr_logs": result.stderr[-1000:] if result.stderr else "Empty",
            "source_file_size_bytes": video_or_audio.stat().st_size if video_or_audio.exists() else 0,
            "target_destination_path": str(out)
        }
        serialized_debug = json.dumps(error_context, indent=2)
        print(f"[CRITICAL SUBPROCESS FAULT] FFmpeg pipeline broke:\n{serialized_debug}")
        raise RuntimeError(f"FFmpeg tracking failure status details:\n{serialized_debug}")
        
    print(f"[DEBUG LOGGER] Audio channel stream stripped smoothly. Output file path verified size: {out.stat().st_size} bytes.")
    return out


def describe_image(path: Path) -> dict:
    """
    Multi-modal image describer with resilient multi-engine fallback cascades 
    and extreme debug traceability.
    """
    print(f"[DEBUG LOGGER] Initializing visual description matrix task for image asset: {path}")
    
    if not _groq_client:
        return {
            "filename": path.name,
            "transcript": "[Extreme Error System Block]: Groq SDK Client initialization missing or unauthenticated.",
            "duration": None
        }

    # Extract clean file context properties
    try:
        file_size_mb = path.stat().st_size / (1024 * 1024)
        print(f"[DEBUG LOGGER] Image metrics -> Name: {path.name} | Size: {file_size_mb:.2f} MB")
        
        with open(path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
        
        mime_type = "image/jpeg" if path.suffix.lower() in [".jpg", ".jpeg"] else f"image/{path.suffix.lower()[1:]}"
        data_url = f"data:{mime_type};base64,{encoded_string}"
    except Exception as io_err:
        exc_type, exc_obj, exc_tb = sys.exc_info()
        return {
            "filename": path.name,
            "transcript": f"[Extreme Error File Reading Block]: Bypassed file translation matrix. Detail: {str(io_err)} | Line: {exc_tb.tb_lineno}",
            "duration": None
        }

    # Cascading fallback loop over model definitions to secure continuous execution paths
    last_captured_error = "No engine processed yet"
    for model_candidate in VISION_MODEL_FALLBACKS:
        print(f"[DEBUG LOGGER] Attempting vision pipeline processing request using engine token: '{model_candidate}'")
        try:
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
                model=model_candidate,
                temperature=0.2,
            )
            
            # Access the structured completion message body safely
            vision_description = chat_completion.choices[0].message.content
            print(f"[DEBUG LOGGER] Vision handshake successful using model target -> '{model_candidate}'")
            
            return {
                "filename": path.name,
                "transcript": f"[Visual AI Description via {model_candidate}]: {vision_description}",
                "duration": None,
            }
        except Exception as model_level_error:
            last_captured_error = str(model_level_error)
            print(f"[WARNING LOGGER] Model execution failed for token '{model_candidate}': {last_captured_error}")
            continue

    # All engines exhausted - serialize comprehensive trace dump to user viewports
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
    print(f"[DEBUG LOGGER] Initiating cloud retrieval sequence tracking for URL endpoint: {url}")
    ffmpeg_bin = _find_tool("ffmpeg")
    ytdlp_bin = _find_tool("yt-dlp")
    
    out_dir = Path(tempfile.mkdtemp())
    out_template = str(out_dir / "%(id)s.%(ext)s")
    print(f"[DEBUG LOGGER] Initialized sandboxed retrieval workspace block: {out_dir}")

    cmd = [
        ytdlp_bin, "--ffmpeg-location", ffmpeg_bin,
        "-f", "bestaudio/best", "-x", "--audio-format", "wav",
        "-o", out_template, "--print-json", url
    ]
    
    print(f"[DEBUG LOGGER] Dispatching extractor thread matrix system command: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
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
        meta = json.loads(result.stdout.strip().splitlines()[-1])
        print(f"[DEBUG LOGGER] Meta descriptors parsed successfully. Title matched: '{meta.get('title')}'")
    except Exception as json_err:
        print(f"[CRITICAL JSON ERROR] Failed parsing yt-dlp metadata: {str(json_err)}")
        meta = {"title": "Extracted Media Stream Title Unavailable", "duration": None, "uploader": "Unknown"}

    audio_files = list(out_dir.glob("*.wav"))
    print(f"[DEBUG LOGGER] Active scan discovered workspace files list: {[f.name for f in audio_files]}")
    
    if not audio_files:
        raise RuntimeError(
            f"FILE PIPELINE ERROR: Remote tracking completed successfully but no valid audio wav "
            f"artifacts were generated inside workspace path directory target: {out_dir}"
        )

    # FIXED: Added the explicit array index [0] to extract a single Path object 
    # and strictly match your -> tuple[Path, dict] function signature.
    return audio_files[0], {
        "title": meta.get("title") or "Untitled Link Asset",
        "duration": meta.get("duration"),
        "uploader": meta.get("uploader") or "Unknown Provider",
    }
