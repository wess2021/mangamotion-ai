from __future__ import annotations

import logging
import random
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

KEN_BURNS_EFFECTS = [
    "zoompan=z='min(zoom+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={d}:s={w}x{h},fps=25",
    "zoompan=z='if(lte(zoom,1.0),1.5,max(1.0,zoom-0.002))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={d}:s={w}x{h},fps=25",
    "zoompan=z='1.3':x='if(lte(on,1),0,x+1)':y='ih/2-(ih/zoom/2)':d={d}:s={w}x{h},fps=25",
    "zoompan=z='1.3':x='iw-(iw/zoom)-(on/({d}))*(iw-(iw/zoom))':y='ih/2-(ih/zoom/2)':d={d}:s={w}x{h},fps=25",
]


def _resolve_output_size(image_path: str) -> tuple[int, int]:
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height", "-of", "csv=p=0", image_path],
            capture_output=True, text=True, timeout=10
        )
        parts = result.stdout.strip().split(",")
        if len(parts) == 2:
            w, h = int(parts[0]), int(parts[1])
            if w > 0 and h > 0:
                return _pad_to_even(w, h)
    except Exception:
        pass
    return 960, 720


def _pad_to_even(w: int, h: int) -> tuple[int, int]:
    return w + (w % 2), h + (h % 2)


def generate(
    panel_id: str,
    image_path: str,
    prompt: str,
    duration: float,
    output_dir: Path,
) -> str:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{panel_id}.mp4"

    w, h = _resolve_output_size(image_path)
    fps = 25
    frames = int(duration * fps)

    effect = random.choice(KEN_BURNS_EFFECTS).format(d=frames, w=w, h=h)

    vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=decrease,"
        f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black,"
        f"{effect}"
    )

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", image_path,
        "-vf", vf,
        "-t", str(duration),
        "-pix_fmt", "yuv420p",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        str(output_path),
    ]

    logger.info("Generating mock video for panel %s (%dx%d, %.1fs)", panel_id, w, h, duration)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr[-500:]}")

    logger.info("Mock video saved: %s", output_path)
    return str(output_path)
