from __future__ import annotations

import logging
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

MOOD_MUSIC: dict[str, str] = {
    "battle":    "sin(2*PI*110*t)*0.4+sin(2*PI*165*t)*0.3+sin(2*PI*220*t)*0.2+sin(2*PI*55*t)*0.3",
    "tense":     "sin(2*PI*82*t)*0.5+sin(2*PI*123*t)*0.2+sin(2*PI*41*t)*0.3",
    "emotional": "sin(2*PI*220*t)*0.3+sin(2*PI*277*t)*0.25+sin(2*PI*330*t)*0.2+sin(2*PI*110*t)*0.15",
    "determined":"sin(2*PI*146*t)*0.4+sin(2*PI*220*t)*0.3+sin(2*PI*293*t)*0.2",
    "surprised": "sin(2*PI*440*t)*0.3+sin(2*PI*550*t)*0.2+sin(2*PI*330*t)*0.2",
    "calm":      "sin(2*PI*174*t)*0.2+sin(2*PI*220*t)*0.15+sin(2*PI*261*t)*0.15+sin(2*PI*87*t)*0.1",
}

SFX_EXPR: dict[str, tuple[str, float]] = {
    "boom":     ("sin(2*PI*60*t)*exp(-3*t)*0.8+sin(2*PI*80*t)*exp(-2*t)*0.6", 1.5),
    "crash":    ("sin(2*PI*200*t)*exp(-8*t)*0.7+sin(2*PI*400*t)*exp(-6*t)*0.4", 0.8),
    "bang":     ("sin(2*PI*150*t)*exp(-10*t)*0.9+sin(2*PI*300*t)*exp(-8*t)*0.5", 0.6),
    "slash":    ("sin(2*PI*800*t)*exp(-15*t)*0.6+sin(2*PI*600*t)*exp(-12*t)*0.4", 0.5),
    "whoosh":   ("sin(2*PI*(200+800*t)*t)*exp(-4*t)*0.5", 0.7),
    "thud":     ("sin(2*PI*80*t)*exp(-6*t)*0.8+sin(2*PI*40*t)*exp(-4*t)*0.6", 0.6),
    "default":  ("sin(2*PI*440*t)*exp(-5*t)*0.5", 0.5),
}


def _run_ffmpeg(args: list[str], timeout: int = 60) -> None:
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg error: {result.stderr[-400:]}")


def generate_voice(
    panel_id: str,
    text: str,
    character: str,
    output_dir: Path,
) -> str:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{panel_id}_voice.mp3"

    if not text or not text.strip():
        _generate_silence(str(output_path), duration=1.0)
        return str(output_path)

    try:
        from gtts import gTTS
        tts = gTTS(text=text[:500], lang="en", slow=False)
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tts.save(tmp.name)
            tmp_path = tmp.name
        subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_path,
             "-af", "volume=1.2,atempo=1.05",
             str(output_path)],
            capture_output=True, timeout=30
        )
        Path(tmp_path).unlink(missing_ok=True)
        if output_path.exists():
            logger.info("Voice (gTTS) saved: %s", output_path)
            return str(output_path)
    except Exception as exc:
        logger.warning("gTTS failed for panel %s: %s — using TTS fallback", panel_id, exc)

    _generate_synth_voice(text, str(output_path))
    return str(output_path)


def _generate_synth_voice(text: str, output_path: str) -> None:
    chars = len(text.strip())
    duration = max(1.0, min(chars * 0.07, 8.0))
    freq = 180 + (hash(text) % 80)
    expr = f"sin(2*PI*{freq}*t)*0.4+sin(2*PI*{freq*1.5:.0f}*t)*0.15"
    _run_ffmpeg([
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"aevalsrc={expr}:s=22050:d={duration:.2f}",
        "-af", "atempo=1.3,volume=0.7",
        output_path,
    ])


def _generate_silence(output_path: str, duration: float = 1.0) -> None:
    _run_ffmpeg([
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"anullsrc=channel_layout=mono:sample_rate=22050",
        "-t", str(duration),
        output_path,
    ])


def generate_music(
    project_id: str,
    mood: str,
    duration: float,
    output_dir: Path,
) -> str:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"music_{mood}.mp3"

    expr = MOOD_MUSIC.get(mood.lower(), MOOD_MUSIC["calm"])
    fade_in = min(3.0, duration * 0.1)
    fade_out = min(4.0, duration * 0.15)

    _run_ffmpeg([
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"aevalsrc={expr}:s=44100:d={duration:.2f}",
        "-af", f"volume=0.35,afade=t=in:st=0:d={fade_in:.1f},afade=t=out:st={duration-fade_out:.1f}:d={fade_out:.1f}",
        output_path,
    ], timeout=60)

    logger.info("Ambient music [%s] saved: %s", mood, output_path)
    return str(output_path)


def generate_sfx(
    panel_id: str,
    effect: str,
    output_dir: Path,
) -> str:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{panel_id}_sfx.mp3"

    key = effect.lower().strip()
    expr, duration = SFX_EXPR.get(key, SFX_EXPR["default"])

    _run_ffmpeg([
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"aevalsrc={expr}:s=44100:d={duration:.2f}",
        "-af", "volume=0.8",
        str(output_path),
    ])

    logger.info("SFX [%s] saved: %s", effect, output_path)
    return str(output_path)
