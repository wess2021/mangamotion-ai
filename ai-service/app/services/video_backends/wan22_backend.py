from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def generate(
    panel_id: str,
    image_path: str,
    prompt: str,
    duration: float,
    output_dir: Path,
) -> str:
    """
    Wan 2.2 image-to-video generation (requires local GPU, ~RTX 3060 12GB+).

    Prerequisites (install when GPU is available):
        pip install torch torchvision diffusers accelerate transformers
        # Download wan2.2 weights from Hugging Face:
        # huggingface-cli download Wan-AI/Wan2.2-I2V-A14B --local-dir ./models/wan22

    Environment variables:
        WAN22_MODEL_PATH  — path to downloaded weights (default: ./models/wan22)
    """
    import os
    try:
        import torch
        from diffusers import WanImageToVideoPipeline
        from PIL import Image

        model_path = os.environ.get("WAN22_MODEL_PATH", "./models/wan22")
        pipe = WanImageToVideoPipeline.from_pretrained(
            model_path,
            torch_dtype=torch.bfloat16,
        )
        pipe.enable_model_cpu_offload()

        image = Image.open(image_path).convert("RGB")
        image = image.resize((832, 480))

        num_frames = max(16, int(duration * 16))
        output = pipe(
            image=image,
            prompt=prompt,
            num_inference_steps=25,
            num_frames=num_frames,
        )

        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{panel_id}.mp4"

        from diffusers.utils import export_to_video
        export_to_video(output.frames[0], str(output_path), fps=16)
        logger.info("Wan 2.2 video saved: %s", output_path)
        return str(output_path)

    except ImportError as exc:
        raise RuntimeError(
            f"Wan 2.2 requires torch + diffusers. Install them when GPU is available. ({exc})"
        ) from exc
