from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def generate_voice(panel_id: str, text: str, character: str, output_dir: Path) -> str:
    """
    XTTS v2 voice cloning (requires local GPU ~8GB VRAM).

    Prerequisites:
        pip install TTS torch torchaudio
        # Model downloads automatically on first run (~2GB).

    Environment variables:
        XTTS_SPEAKER_WAV  — optional reference speaker WAV for voice cloning
    """
    import os
    try:
        from TTS.api import TTS as COQUI_TTS
        model = COQUI_TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=True)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{panel_id}_voice.wav"
        speaker_wav = os.environ.get("XTTS_SPEAKER_WAV")
        model.tts_to_file(
            text=text[:500],
            speaker_wav=speaker_wav,
            language="en",
            file_path=str(output_path),
        )
        logger.info("XTTS v2 voice saved: %s", output_path)
        return str(output_path)
    except ImportError as exc:
        raise RuntimeError(f"XTTS v2 requires TTS + torch. Install when GPU is ready. ({exc})") from exc


def generate_music(project_id: str, mood: str, duration: float, output_dir: Path) -> str:
    raise NotImplementedError("XTTS backend does not generate music. Use mock or AudioCraft.")


def generate_sfx(panel_id: str, effect: str, output_dir: Path) -> str:
    raise NotImplementedError("XTTS backend does not generate SFX. Use mock or AudioCraft.")
