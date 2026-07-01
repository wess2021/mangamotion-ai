from __future__ import annotations

import logging
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


def _get_backend():
    backend = settings.video_backend.lower()
    if backend == "wan22":
        from app.services.video_backends import wan22_backend
        return wan22_backend
    elif backend == "replicate":
        from app.services.video_backends import replicate_backend
        return replicate_backend
    else:
        from app.services.video_backends import mock_backend
        return mock_backend


def generate_panel_video(
    project_id: str,
    panel_id: str,
    image_path: str,
    prompt: str,
    duration: float = 6.0,
) -> str:
    output_dir = Path(settings.storage_path) / "projects" / project_id / "videos"
    backend = _get_backend()
    logger.info(
        "Generating video [backend=%s] project=%s panel=%s",
        settings.video_backend, project_id, panel_id
    )
    video_path = backend.generate(
        panel_id=panel_id,
        image_path=image_path,
        prompt=prompt,
        duration=duration,
        output_dir=output_dir,
    )
    return video_path
