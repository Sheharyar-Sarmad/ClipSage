from pathlib import Path
from app.services import media, transcription

p = Path("test.mp4")
audio = media.extract_audio(p)
print("audio file:", audio, audio.stat().st_size if audio else None)

if audio:
    print(transcription.transcribe(audio))