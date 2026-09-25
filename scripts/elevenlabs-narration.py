#!/usr/bin/env python3
"""Render the fixed Agentic Beef rehearsal from ElevenLabs; never prints its API key.

The request payload is limited to the existing fictional beat text.  Voice IDs must be
provided explicitly so a paid run never accidentally selects a provider default.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import math
import pathlib
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import wave

ROOT = pathlib.Path(__file__).resolve().parents[1]
RECEIPT = ROOT / "artifacts/audio-receipt.json"
KEY_FILE = ROOT / ".local/elevenlabs.key"
CACHE = ROOT / "artifacts/audio/elevenlabs"
OUT_WAV = ROOT / "artifacts/elevenlabs-narration.wav"
OUT_SRT = ROOT / "artifacts/elevenlabs-demo.srt"
OUT_RECEIPT = ROOT / "artifacts/elevenlabs-audio-receipt.json"
RATE = 24000
TOTAL = 180
FIXTURE_SHA256 = "e995f5bcd05eb9143b52ae4a288a83b7934cd9365e729104957d263382410779"


def run(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, check=True, text=True, capture_output=True)


def api_key() -> str:
    try:
        key = KEY_FILE.read_text().strip()
    except FileNotFoundError as exc:
        raise RuntimeError(f"Missing API key file: {KEY_FILE}") from exc
    if not key:
        raise RuntimeError("ElevenLabs API key file is empty")
    return key


def request_json(path: str, key: str) -> dict:
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1{path}",
        headers={"xi-api-key": key, "accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.load(response)


def list_voices(key: str) -> None:
    payload = request_json("/voices", key)
    for voice in payload.get("voices", []):
        # Deliberately limited to non-secret selector material.
        print(json.dumps({
            "name": voice.get("name"), "category": voice.get("category"),
            "id": voice.get("voice_id"),
        }, ensure_ascii=False))


def parse_voices(value: str) -> dict[str, str]:
    parts = [item.strip() for item in value.split(",")]
    if len(parts) != 3 or any(not re.fullmatch(r"[A-Za-z0-9]{20,100}", item) for item in parts):
        raise argparse.ArgumentTypeError("--voices needs three 20-100 character alphanumeric voice IDs")
    return dict(zip(("HOST", "JULES", "ROWAN"), parts, strict=True))


def role_key(role: str) -> str:
    return "JULES" if role == "Jules" else "ROWAN" if role == "Rowan" else "HOST"


def stamp(seconds: float) -> str:
    ms = round(seconds * 1000)
    return f"{ms // 3_600_000:02}:{ms // 60_000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


def duration(path: pathlib.Path) -> float:
    result = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", str(path)])
    return float(result.stdout.strip())


def fetch_beat(index: int, beat: list, voice_id: str, key: str) -> pathlib.Path:
    # Voice ID and text fingerprint keep a changed selection or script from reusing stale paid audio.
    fingerprint = hashlib.sha256((voice_id + "\0" + beat[3]).encode()).hexdigest()[:16]
    target = CACHE / f"beat-{index:02}-{fingerprint}.mp3"
    if target.exists() and target.stat().st_size > 128:
        return target
    body = json.dumps({
        "text": beat[3], "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.46, "similarity_boost": 0.72, "style": 0.28, "use_speaker_boost": True},
    }).encode()
    request = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream",
        data=body, method="POST",
        headers={"xi-api-key": key, "accept": "audio/mpeg", "content-type": "application/json"},
    )
    temporary = target.with_suffix(".part")
    try:
        with urllib.request.urlopen(request, timeout=45) as response, temporary.open("wb") as output:
            shutil.copyfileobj(response, output)
        if temporary.stat().st_size <= 128:
            raise RuntimeError(f"ElevenLabs returned empty audio for beat {index}")
        temporary.replace(target)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
    return target


def wav_samples(path: pathlib.Path, start: float, slot: float, temp: pathlib.Path) -> tuple[list[int], float, float]:
    raw_duration = duration(path)
    speed = raw_duration / slot
    if speed > 1.5 + 1e-6:
        raise RuntimeError(f"Beat at {start:g}s needs {speed:.2f}x speed, above the 1.50x limit")
    out = temp / f"{start:g}.wav"
    command = ["ffmpeg", "-v", "error", "-y", "-i", str(path), "-ar", str(RATE), "-ac", "1"]
    if speed > 1:
        command += ["-filter:a", f"atempo={speed:.8f}"]
    command += ["-c:a", "pcm_s16le", str(out)]
    run(command)
    with wave.open(str(out), "rb") as source:
        if source.getframerate() != RATE or source.getnchannels() != 1 or source.getsampwidth() != 2:
            raise RuntimeError(f"Unexpected ffmpeg output for beat at {start:g}s")
        frames = source.getnframes()
        samples = list(struct.unpack("<" + "h" * frames, source.readframes(frames)))
    rendered = len(samples) / RATE
    if rendered > slot + .02:
        raise RuntimeError(f"Beat at {start:g}s still overruns its slot ({rendered:.2f}s > {slot:.2f}s)")
    return samples, raw_duration, rendered


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list-voices", action="store_true", help="Print safe voice metadata, then exit")
    parser.add_argument("--voices", type=parse_voices, help="Explicit HOST,JULES,ROWAN ElevenLabs voice IDs")
    args = parser.parse_args()
    key = api_key()
    if args.list_voices:
        list_voices(key)
        return
    if args.voices is None:
        parser.error("--voices HOST,JULES,ROWAN is required for rendering")
    fixture_bytes = RECEIPT.read_bytes()
    if hashlib.sha256(fixture_bytes).hexdigest() != FIXTURE_SHA256:
        raise RuntimeError("audio-receipt.json fixture hash differs; refusing to render an unreviewed schedule")
    data = json.loads(fixture_bytes)
    beats = data["beats"]
    if len(beats) != 13 or data.get("durationSeconds") != TOTAL:
        raise RuntimeError("Unexpected audio receipt; refusing to render a changed schedule")
    CACHE.mkdir(parents=True, exist_ok=True)
    assignments = [(i, beat, args.voices[role_key(beat[2])]) for i, beat in enumerate(beats)]
    mp3s: dict[int, pathlib.Path] = {}
    # A max of three concurrent calls controls cost and respects the requested three voices.
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(fetch_beat, i, beat, voice, key): i for i, beat, voice in assignments}
        for future in concurrent.futures.as_completed(futures):
            index = futures[future]
            try:
                mp3s[index] = future.result()
            except urllib.error.HTTPError as exc:
                for pending in futures: pending.cancel()
                raise RuntimeError(f"ElevenLabs rejected beat {index}: HTTP {exc.code}") from exc
            except urllib.error.URLError as exc:
                for pending in futures: pending.cancel()
                raise RuntimeError(f"ElevenLabs connection failed for beat {index}: {exc.reason}") from exc
            except Exception:
                for pending in futures: pending.cancel()
                raise

    mix = [0.0] * (RATE * TOTAL)
    rendered = []
    with tempfile.TemporaryDirectory(prefix="beef-elevenlabs-") as temporary:
        temp = pathlib.Path(temporary)
        for index, beat, voice in assignments:
            start = float(beat[0])
            next_start = float(beats[index + 1][0]) if index + 1 < len(beats) else TOTAL
            # 250 ms preserves the original pacing and prevents boundary clicks/overlap.
            slot = next_start - start - .25
            samples, raw, fit = wav_samples(mp3s[index], start, slot, temp)
            for offset, sample in enumerate(samples):
                mix[int(start * RATE) + offset] += sample / 32768 * .75
            rendered.append({"beat": index, "startSeconds": start, "role": beat[2], "voice": role_key(beat[2]), "rawSeconds": round(raw, 3), "renderedSeconds": round(fit, 3), "tempo": round(max(1.0, raw / slot), 4)})

    # Original, low-level non-musical ring/impact cues from the offline narration path.
    for start, notes in [(12, [98, 147, 196]), (13.5, [123, 164, 246]), (15, [880, 1320]), (50, [330, 220]), (81, [880, 1320]), (121, [196, 247]), (155, [196, 247, 294])]:
        for note_index, frequency in enumerate(notes):
            for sample_index in range(int(.5 * RATE)):
                t = sample_index / RATE
                envelope = min(1, t / .015) * math.exp(-t * 14)
                target = int((start + note_index * .12) * RATE) + sample_index
                if target < len(mix):
                    mix[target] += .045 * envelope * math.sin(2 * math.pi * frequency * t)
    peak = max(abs(value) for value in mix) or 1
    scale = min(1, .89 / peak)
    with wave.open(str(OUT_WAV), "wb") as output:
        output.setnchannels(1); output.setsampwidth(2); output.setframerate(RATE)
        output.writeframes(struct.pack("<" + "h" * len(mix), *(round(value * scale * 32767) for value in mix)))
    with OUT_SRT.open("w") as output:
        for index, beat in enumerate(beats, 1):
            start = float(beat[0]); rendered_seconds = rendered[index - 1]["renderedSeconds"]
            output.write(f"{index}\n{stamp(start)} --> {stamp(start + rendered_seconds)}\n{beat[2]}: {beat[3]}\n\n")
    receipt = {
        "durationSeconds": TOTAL, "sampleRate": RATE, "peakBeforeScale": round(peak, 6), "scale": round(scale, 6),
        "model": "eleven_multilingual_v2", "voiceRoles": {name: "provided" for name in args.voices},
        "cacheDirectory": "artifacts/audio/elevenlabs", "beats": rendered,
        "effects": "original restrained oscillator cues from narration.py",
        "videoCommand": "ffmpeg -i artifacts/demo-screen.webm -i artifacts/elevenlabs-narration.wav -filter_complex \"[0:v]pad=1440:1040:0:0:black,subtitles=artifacts/elevenlabs-demo.srt:force_style='Alignment=2,MarginV=18,FontSize=8,Outline=0.6,MarginL=12,MarginR=12'[captioned];[captioned]drawtext=text='POST-DEADLINE UPDATE | SYNTHETIC VOICES | RECORDED BEDROCK COACHING | X DEFERRED':x=(w-text_w)/2:y=1011:fontcolor=white:fontsize=17[outv]\" -map '[outv]' -map 1:a -shortest -c:v libx264 -c:a aac artifacts/agentic-beef-elevenlabs.mp4",
    }
    OUT_RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n")
    print(f"Rendered {len(beats)} beats to {OUT_WAV}; captions: {OUT_SRT}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
