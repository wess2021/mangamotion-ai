from pathlib import Path
import zipfile

from PIL import Image

from app.config import settings

SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def ensure_project_dirs(project_id: str) -> Path:
    base = Path(settings.storage_path) / "projects" / project_id
    (base / "pages").mkdir(parents=True, exist_ok=True)
    (base / "panels").mkdir(parents=True, exist_ok=True)
    return base


def extract_pages(project_id: str, source_path: str) -> list[dict]:
    base = ensure_project_dirs(project_id)
    source = Path(source_path)
    pages_dir = base / "pages"
    pages: list[dict] = []

    if source.suffix.lower() == ".zip":
        with zipfile.ZipFile(source, "r") as archive:
            archive.extractall(pages_dir)
        image_files = sorted(
            p for p in pages_dir.rglob("*")
            if p.is_file() and p.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS
        )
    elif source.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS:
        destination = pages_dir / source.name
        destination.write_bytes(source.read_bytes())
        image_files = [destination]
    elif source.is_dir():
        image_files = sorted(
            p for p in source.rglob("*")
            if p.is_file() and p.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS
        )
    else:
        raise ValueError(f"Unsupported source format: {source.suffix or 'unknown'}")

    for index, image_path in enumerate(image_files, start=1):
        pages.append({
            "page_number": index,
            "image_path": str(image_path),
            "width": Image.open(image_path).size[0],
            "height": Image.open(image_path).size[1],
        })

    return pages
