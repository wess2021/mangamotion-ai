from __future__ import annotations

import logging
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

PANEL_DURATION = 6.0  # seconds per panel (keep in sync with video backend)


def _run(args: list[str], timeout: int = 300) -> None:
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg error:\n{result.stderr[-600:]}")


def generate_srt(panels: list[dict], output_path: str) -> None:
    """Build an SRT subtitle file from per-panel OCR text."""
    lines: list[str] = []
    idx = 1
    for i, panel in enumerate(panels):
        text = (panel.get("ocr_text") or "").strip()
        if not text:
            continue
        start_sec = i * PANEL_DURATION
        end_sec   = start_sec + PANEL_DURATION
        start = _fmt_srt(start_sec)
        end   = _fmt_srt(end_sec)
        lines.append(f"{idx}\n{start} --> {end}\n{text}\n")
        idx += 1
    Path(output_path).write_text("\n".join(lines), encoding="utf-8")


def _fmt_srt(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def merge_project(
    project_id: str,
    panels: list[dict],
    music_path: str | None,
    output_dir: str,
) -> dict:
    """
    Merge all panel videos into a single MP4 with:
    - Concatenated video track
    - Background music (attenuated)
    - Per-panel voice audio timed to correct timestamps
    - SRT subtitle file alongside the MP4
    Returns {"video_path": ..., "srt_path": ...}
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    video_panels = [p for p in panels if p.get("video_path")]
    if not video_panels:
        raise ValueError("No animated panels to merge — animate panels first.")

    # ── Step 1: Build concat list ─────────────────────────────────────────────
    concat_file = out / "concat.txt"
    with open(concat_file, "w") as f:
        for p in video_panels:
            f.write(f"file '{p['video_path']}'\n")
            f.write(f"duration {PANEL_DURATION}\n")

    silent_concat = out / "concat_silent.mp4"
    _run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat_file),
        "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
        "-c:v", "libx264", "-crf", "23", "-preset", "fast",
        "-an",
        str(silent_concat),
    ])

    total_duration = len(video_panels) * PANEL_DURATION

    # ── Step 2: Build composite audio track ──────────────────────────────────
    audio_inputs: list[str] = []
    filter_parts: list[str] = []

    # Music (input 0 if present)
    if music_path and Path(music_path).exists():
        audio_inputs += ["-i", music_path]
        mi = len(audio_inputs) // 2 - 1
        filter_parts.append(f"[{mi}:a]volume=0.25,atrim=0:{total_duration}[music]")

    # Per-panel voices
    voice_delays: list[str] = []
    for i, panel in enumerate(video_panels):
        vpath = panel.get("voice_path")
        if not vpath or not Path(vpath).exists():
            continue
        audio_inputs += ["-i", vpath]
        vi = len(audio_inputs) // 2 - 1
        delay_ms = int(i * PANEL_DURATION * 1000)
        label = f"v{i}"
        filter_parts.append(
            f"[{vi}:a]volume=1.0,adelay={delay_ms}|{delay_ms},apad=whole_dur={total_duration}[{label}]"
        )
        voice_delays.append(label)

    final_audio = out / "mixed_audio.mp3"
    if filter_parts:
        all_labels = (["[music]"] if (music_path and Path(music_path).exists()) else []) + \
                     [f"[{v}]" for v in voice_delays]
        n_mix = len(all_labels)
        if n_mix == 1:
            filter_parts.append(f"{all_labels[0]}acopy[aout]")
        else:
            filter_parts.append(
                f"{''.join(all_labels)}amix=inputs={n_mix}:duration=first:dropout_transition=0[aout]"
            )
        filter_str = ";".join(filter_parts)
        _run([
            "ffmpeg", "-y",
            *audio_inputs,
            "-filter_complex", filter_str,
            "-map", "[aout]",
            "-t", str(total_duration),
            str(final_audio),
        ])
        has_audio = True
    else:
        has_audio = False

    # ── Step 3: Combine video + audio ─────────────────────────────────────────
    final_mp4 = out / "final.mp4"
    if has_audio:
        _run([
            "ffmpeg", "-y",
            "-i", str(silent_concat),
            "-i", str(final_audio),
            "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
            "-shortest",
            str(final_mp4),
        ])
    else:
        silent_concat.rename(final_mp4)

    # ── Step 4: SRT subtitles ─────────────────────────────────────────────────
    srt_path = out / "subtitles.srt"
    generate_srt(video_panels, str(srt_path))

    logger.info(
        "Export complete for project %s: %s (%.1fs, %d panels, audio=%s)",
        project_id, final_mp4, total_duration, len(video_panels), has_audio,
    )
    return {
        "video_path": str(final_mp4),
        "srt_path": str(srt_path) if srt_path.exists() else None,
        "duration_seconds": total_duration,
        "panel_count": len(video_panels),
    }
