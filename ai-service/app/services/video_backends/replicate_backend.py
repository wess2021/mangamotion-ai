from __future__ import annotations

import base64
import logging
import os
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

REPLICATE_API_URL = "https://api.replicate.com/v1/predictions"
WAN22_MODEL_VERSION = "wan-ai/wan-2.2-i2v-480p"


def _encode_image(image_path: str) -> str:
    from PIL import Image
    import io
    img = Image.open(image_path).convert("RGB")
    img.thumbnail((832, 480))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def generate(
    panel_id: str,
    image_path: str,
    prompt: str,
    duration: float,
    output_dir: Path,
) -> str:
    """
    Generate video via Replicate API using Wan 2.2.
    Requires REPLICATE_API_TOKEN environment variable.
    """
    token = os.environ.get("REPLICATE_API_TOKEN", "")
    if not token:
        raise RuntimeError("REPLICATE_API_TOKEN environment variable not set")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "wait=120",
    }

    image_data = _encode_image(image_path)

    payload = {
        "version": WAN22_MODEL_VERSION,
        "input": {
            "image": image_data,
            "prompt": prompt,
            "num_frames": max(16, int(duration * 16)),
            "guidance_scale": 6.0,
        },
    }

    logger.info("Submitting panel %s to Replicate Wan 2.2", panel_id)
    resp = httpx.post(REPLICATE_API_URL, json=payload, headers=headers, timeout=180)
    resp.raise_for_status()
    data = resp.json()

    video_url = None
    if isinstance(data.get("output"), str):
        video_url = data["output"]
    elif isinstance(data.get("output"), list) and data["output"]:
        video_url = data["output"][0]

    if not video_url:
        prediction_id = data.get("id", "")
        poll_url = f"{REPLICATE_API_URL}/{prediction_id}"
        for _ in range(60):
            import time
            time.sleep(5)
            poll = httpx.get(poll_url, headers=headers, timeout=30)
            poll_data = poll.json()
            status = poll_data.get("status")
            if status == "succeeded":
                video_url = poll_data.get("output") or ""
                if isinstance(video_url, list):
                    video_url = video_url[0]
                break
            elif status in ("failed", "canceled"):
                raise RuntimeError(f"Replicate prediction failed: {poll_data.get('error')}")

    if not video_url:
        raise RuntimeError("Replicate did not return a video URL")

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{panel_id}.mp4"

    video_resp = httpx.get(video_url, timeout=120)
    video_resp.raise_for_status()
    output_path.write_bytes(video_resp.content)
    logger.info("Replicate video saved: %s", output_path)
    return str(output_path)
