from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from app.config import settings


def detect_panels(project_id: str, pages: list[dict]) -> list[dict]:
    panels: list[dict] = []
    panel_counter = 1
    base = Path(settings.storage_path) / "projects" / project_id / "panels"
    base.mkdir(parents=True, exist_ok=True)

    for page in pages:
        page_number = page["page_number"]
        image_path = page["image_path"]
        page_panels = _detect_panels_on_page(image_path)

        for local_index, bounds in enumerate(page_panels, start=1):
            panel_image = _crop_panel(image_path, bounds)
            output_path = base / f"page{page_number:03d}_panel{local_index:03d}.png"
            panel_image.save(output_path)

            panels.append({
                "page_number": page_number,
                "panel_number": local_index,
                "global_panel_number": panel_counter,
                "image_path": str(output_path),
                "x": bounds["x"],
                "y": bounds["y"],
                "width": bounds["width"],
                "height": bounds["height"],
            })
            panel_counter += 1

    return panels


def _detect_panels_on_page(image_path: str) -> list[dict]:
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Unable to read image: {image_path}")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 240, 255, cv2.THRESH_BINARY_INV)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    height, width = gray.shape
    min_area = (width * height) * 0.01

    boxes: list[dict] = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area < min_area:
            continue
        if w < width * 0.08 or h < height * 0.05:
            continue
        boxes.append({"x": int(x), "y": int(y), "width": int(w), "height": int(h)})

    boxes.sort(key=lambda b: (b["y"], b["x"]))

    if not boxes:
        boxes = [{"x": 0, "y": 0, "width": width, "height": height}]

    return boxes


def _crop_panel(image_path: str, bounds: dict) -> Image.Image:
    image = Image.open(image_path).convert("RGB")
    return image.crop((
        bounds["x"],
        bounds["y"],
        bounds["x"] + bounds["width"],
        bounds["y"] + bounds["height"],
    ))
